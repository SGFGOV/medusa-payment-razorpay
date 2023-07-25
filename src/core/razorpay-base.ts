import Razorpay from "razorpay";
import { EOL } from "os";
import {
  AbstractPaymentProcessor,
  isPaymentProcessorError,
  PaymentProcessorContext,
  PaymentProcessorError,
  PaymentProcessorSessionResponse,
  PaymentSessionStatus,
} from "@medusajs/medusa";
import {
  ErrorCodes,
  ErrorIntentStatus,
  PaymentIntentOptions,
  RazorpayOptions,
} from "../types";
import { MedusaError } from "@medusajs/utils";
import { Orders } from "razorpay/dist/types/orders";
import crypto from "crypto";

abstract class RazorpayBase extends AbstractPaymentProcessor {
  static identifier = "";

  protected readonly options_: RazorpayOptions;
  protected razorpay_: Razorpay;

  protected constructor(_, options) {
    super(_, options);

    this.options_ = options;

    this.init();
  }

  protected init(): void {
    this.razorpay_ =
      this.razorpay_ ||
      new Razorpay({
        key_id: this.options_.key_id,
        key_secret: this.options_.key_secret,
        headers: {
          "Content-Type": "application/json",
          "X-Razorpay-Account": this.options_.razorpay_account,
        },
      });
  }

  abstract get paymentIntentOptions(): PaymentIntentOptions;

  getPaymentIntentOptions(): PaymentIntentOptions {
    const options: PaymentIntentOptions = {};

    if (this?.paymentIntentOptions?.capture_method) {
      options.capture_method = this.paymentIntentOptions.capture_method;
    }

    if (this?.paymentIntentOptions?.setup_future_usage) {
      options.setup_future_usage = this.paymentIntentOptions.setup_future_usage;
    }

    if (this?.paymentIntentOptions?.payment_method_types) {
      options.payment_method_types =
        this.paymentIntentOptions.payment_method_types;
    }

    return options;
  }

  _validateSignature(
    razorpay_payment_id: string,
    razorpay_order_id: string,
    razorpay_signature: string
  ): boolean {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", this.options_.key_secret as string)
      .update(body.toString())
      .digest("hex");
    return expectedSignature === razorpay_signature;
  }

  async getPaymentStatus(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentSessionStatus> {
    const id = paymentSessionData.id as string;
    const paymentIntent = await this.razorpay_.payments.fetch(id);

    switch (paymentIntent.status) {
      // created' | 'authorized' | 'captured' | 'refunded' | 'failed'
      case "created":
        return PaymentSessionStatus.REQUIRES_MORE;
      case "failed":
        return PaymentSessionStatus.ERROR;
      case "authorized":
      case "captured":
      case "refunded":
        return PaymentSessionStatus.AUTHORIZED;

      default:
        return PaymentSessionStatus.PENDING;
    }
  }

  async initiatePayment(
    context: PaymentProcessorContext
  ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse> {
    const intentRequestData = this.getPaymentIntentOptions();
    const {
      email,
      context: cart_context,
      currency_code,
      amount,
      resource_id,
      customer,
    } = context;

    const description = (cart_context.payment_description ??
      this.options_?.payment_description) as string;

    const intentRequest: Orders.RazorpayOrderCreateRequestBody = {
      amount: Math.round(amount),
      currency: currency_code,
      notes: { resource_id },
      payment: {
        capture: this.options_.capture ? "automatic" : "manual",
        capture_options: {
          refund_speed: this.options_.refund_speed ?? "normal",
          automatic_expiry_period: this.options_.automatic_expiry_period ?? 5,
          manual_expiry_period: this.options_.manual_expiry_period ?? 10,
        },
      },
      ...intentRequestData,
    };

    if (customer?.metadata?.razorpay_id) {
      intentRequest.notes!.razorpay_id = customer.metadata
        .razorpay_id as string;
    } else {
      let razorpayCustomer;
      try {
        razorpayCustomer = await this.razorpay_.customers.create({
          email,
          name: `${customer?.last_name}, ${customer?.last_name} `,
        });
      } catch (e) {
        return this.buildError(
          "An error occurred in initiatePayment when creating a Razorpay customer",
          e
        );
      }

      intentRequest.notes!.customer_id = razorpayCustomer.id;
    }

    let session_data;
    try {
      session_data = (await this.razorpay_.orders.create(
        intentRequest
      )) as unknown as Record<string, unknown>;
    } catch (e) {
      return this.buildError(
        "An error occurred in InitiatePayment during the creation of the razorpay payment intent",
        e
      );
    }

    return {
      session_data,
      update_requests: customer?.metadata?.razorpay_id
        ? undefined
        : {
            customer_metadata: {
              razorpay_id: intentRequest.notes!.customer_id,
            },
          },
    };
  }

  async authorizePayment(
    paymentSessionData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<
    | PaymentProcessorError
    | {
        status: PaymentSessionStatus;
        data: PaymentProcessorSessionResponse["session_data"];
      }
  > {
    const status = await this.getPaymentStatus(paymentSessionData);
    return { data: paymentSessionData, status };
  }

  async cancelPayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    const error: PaymentProcessorError = {
      error: "Unable to cancel as razorpay doesn't support cancellation",
      code: ErrorCodes.UNSUPPORTED_OPERATION,
    };
    return error;

    /* try {
      const id = paymentSessionData.id as string
      return (await this.razorpay_.orders.edit(
        paymentSessionData.order_id as string,
        {
          notes: {
            status: "cancelled"
          }
        }
      )) as unknown as PaymentProcessorSessionResponse["session_data"]
    } catch (error) {
      if (error.payment_intent?.status === ErrorIntentStatus.CANCELED) {
        return error.payment_intent
      }

      return this.buildError("An error occurred in cancelPayment", error)
    }*/
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    const id = paymentSessionData.id as string;
    try {
      const intent = await this.razorpay_.payments.capture(
        id,
        paymentSessionData["amount"] as string,
        paymentSessionData.currency as string
      );
      return intent as unknown as PaymentProcessorSessionResponse["session_data"];
    } catch (error) {
      if (error.code === ErrorCodes.PAYMENT_INTENT_UNEXPECTED_STATE) {
        if (error.payment_intent?.status === ErrorIntentStatus.SUCCEEDED) {
          return error.payment_intent;
        }
      }

      return this.buildError("An error occurred in capturePayment", error);
    }
  }

  async deletePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    return await this.cancelPayment(paymentSessionData);
  }

  async refundPayment(
    paymentSessionData: Record<string, unknown>,
    refundAmount: number
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    const id = paymentSessionData.id as string;

    try {
      await this.razorpay_.payments.refund(id, {
        amount: Math.round(refundAmount),
        ...paymentSessionData,
      });
    } catch (e) {
      return this.buildError("An error occurred in refundPayment", e);
    }

    return paymentSessionData;
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    try {
      const id = paymentSessionData.id as string;
      const intent = await this.razorpay_.payments.fetch(id);
      return intent as unknown as PaymentProcessorSessionResponse["session_data"];
    } catch (e) {
      return this.buildError("An error occurred in retrievePayment", e);
    }
  }

  async updatePayment(
    context: PaymentProcessorContext
  ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse | void> {
    const { amount, customer, paymentSessionData } = context;
    const razorpayId = customer?.metadata?.razorpay_id;

    if (razorpayId !== paymentSessionData.customer) {
      const result = await this.initiatePayment(context);
      if (isPaymentProcessorError(result)) {
        return this.buildError(
          "An error occurred in updatePayment during the initiate of the new payment for the new customer",
          result
        );
      }

      return result;
    } else {
      if (amount && paymentSessionData.amount === Math.round(amount)) {
        return;
      }

      try {
        const id = paymentSessionData.id as string;
        const sessionData = (await this.razorpay_.payments.edit(id, {
          notes: {
            updated: "true",
            amount: Math.round(amount),
          },
        })) as unknown as PaymentProcessorSessionResponse["session_data"];

        return { session_data: sessionData };
      } catch (e) {
        return this.buildError("An error occurred in updatePayment", e);
      }
    }
  }

  async updatePaymentData(
    sessionId: string,
    data: Record<string, unknown>
  ): Promise<
    PaymentProcessorSessionResponse["session_data"] | PaymentProcessorError
  > {
    try {
      // Prevent from updating the amount from here as it should go through
      // the updatePayment method to perform the correct logic
      if (data.amount) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Cannot update amount, use updatePayment instead"
        );
      }

      return (await this.razorpay_.orders.edit(sessionId, {
        ...data,
      })) as unknown as PaymentProcessorSessionResponse["session_data"];
    } catch (e) {
      return this.buildError("An error occurred in updatePaymentData", e);
    }
  }
  /*
  /**
   * Constructs Razorpay Webhook event
   * @param {object} data - the data of the webhook request: req.body
   * @param {object} signature - the Razorpay signature on the event, that
   *    ensures integrity of the webhook event
   * @return {object} Razorpay Webhook event
   */
  /*
  constructWebhookEvent(data, signature) {
    return this.razorpay_..(
      data,
      signature,
      this.options_.webhook_secret
    )
  }*/

  protected buildError(
    message: string,
    e: PaymentProcessorError | Error
  ): PaymentProcessorError {
    return {
      error: message,
      code: "code" in e ? e.code : "",
      detail: isPaymentProcessorError(e)
        ? `${e.error}${EOL}${e.detail ?? ""}`
        : "detail" in e
        ? e.detail
        : e.message ?? "",
    };
  }
}

export default RazorpayBase;
