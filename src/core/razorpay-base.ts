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
import { ErrorCodes, PaymentIntentOptions, RazorpayOptions } from "../types";
import { MedusaError } from "@medusajs/utils";
import { Orders } from "razorpay/dist/types/orders";
import crypto from "crypto";
import { Refunds } from "razorpay/dist/types/refunds";

/**
 * The paymentIntent object corresponds to a razorpay order.
 *
 */

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
          "X-Razorpay-Account": this.options_.razorpay_account ?? undefined,
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

  async getRazorpayPaymentStatus(
    paymentIntent: Orders.RazorpayOrder
  ): Promise<PaymentSessionStatus> {
    if (!paymentIntent) {
      return PaymentSessionStatus.ERROR;
    }
    return PaymentSessionStatus.AUTHORIZED;
    /*
    if (paymentIntent.amount_due != 0) {
      return PaymentSessionStatus.REQUIRES_MORE;
    }

    if (paymentIntent.amount_paid == paymentIntent.amount) {
      return PaymentSessionStatus.AUTHORIZED;
    }
    return PaymentSessionStatus.PENDING;*/

    /**
     * ToFix part payments
     */
  }

  async getPaymentStatus(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentSessionStatus> {
    const id = paymentSessionData.id as string;
    const paymentIntent = await this.razorpay_.orders.fetch(id);

    switch (paymentIntent.status) {
      // created' | 'authorized' | 'captured' | 'refunded' | 'failed'
      case "created":
        return PaymentSessionStatus.REQUIRES_MORE;

      case "paid":
        return PaymentSessionStatus.AUTHORIZED;

      case "attempted":
        return await this.getRazorpayPaymentStatus(paymentIntent);

      default:
        return PaymentSessionStatus.PENDING;
    }
  }

  async initiatePayment(
    context: PaymentProcessorContext
  ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse> {
    const intentRequestData = this.getPaymentIntentOptions();
    const { email, currency_code, amount, resource_id, customer } = context;

    const intentRequest: Orders.RazorpayOrderCreateRequestBody = {
      amount: Math.round(amount),
      currency: currency_code.toUpperCase(),
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

    if (!(customer?.billing_address?.phone || customer?.phone)) {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        "Phone number not found in context",
        MedusaError.Codes.CART_INCOMPATIBLE_STATE
      );
    }

    if (customer?.metadata?.razorpay_id) {
      intentRequest.notes!.razorpay_id = customer.metadata
        .razorpay_id as string;
    } else {
      let razorpayCustomer;
      try {
        razorpayCustomer = await this.razorpay_.customers.create({
          email,
          contact: customer?.phone ?? customer?.billing_address?.phone ?? "",
          gstin: customer?.metadata?.gstin as string,
          fail_existing: 0,
          name: `${customer?.last_name} ${customer?.last_name}`,
          notes: {
            updated_at: new Date().toISOString(),
          },
        });
      } catch (e) {
        return this.buildError(
          "An error occurred in initiatePayment when creating a Razorpay customer",
          e
        );
      }

      intentRequest.notes!.customer_id = razorpayCustomer.id;
    }

    let session_data: Orders.RazorpayOrder;
    try {
      session_data = await this.razorpay_.orders.create(intentRequest);
    } catch (e) {
      return this.buildError(
        "An error occurred in InitiatePayment during the creation of the razorpay payment intent",
        e
      );
    }

    return {
      session_data: session_data as any,
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
    context?: Record<string, unknown>
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
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    const order_id = (paymentSessionData as unknown as Orders.RazorpayOrder).id;
    const paymentsResponse = await this.razorpay_.orders.fetchPayments(
      order_id
    );
    const possibleCatpures = paymentsResponse.items?.filter(
      (item) => item.status == "authorized"
    );
    const result = possibleCatpures?.map(async (payment) => {
      const { id, amount, currency } = payment;

      const paymentIntent = await this.razorpay_.payments.capture(
        id,
        amount as string,
        currency as string
      );
      return paymentIntent;
    });
    if (result) {
      const payments = await Promise.all(result);
      const res = payments.reduce(
        (acc, curr) => ((acc[curr.id] = curr), acc),
        {}
      );
      (paymentSessionData as unknown as Orders.RazorpayOrder).payments = res;
    }
    return paymentSessionData;
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
    const id = (paymentSessionData as unknown as Orders.RazorpayOrder)
      .id as string;
    const paymentIntent = await this.razorpay_.orders.fetch(id);
    const paymentList = paymentIntent.payments ?? {};

    const paymentIds = Object.keys(paymentList);
    const payments = await Promise.all(
      paymentIds.map(
        async (paymentId) => await this.razorpay_.payments.fetch(paymentId)
      )
    );
    const payment_id = payments.find((p) => {
      parseInt(p.amount.toString()) >= refundAmount;
    })?.id;

    if (payment_id) {
      const refundRequest: Refunds.RazorpayRefundCreateRequestBody = {
        amount: refundAmount,
      };
      try {
        const refundSession = await this.razorpay_.payments.refund(
          payment_id,
          refundRequest
        );
        const refundsIssued =
          paymentSessionData.refundSessions as Refunds.RazorpayRefund[];
        if (refundsIssued?.length > 0) {
          refundsIssued.push(refundSession);
        } else {
          paymentSessionData.refundSessions = [refundSession];
        }
      } catch (e) {
        return this.buildError("An error occurred in refundPayment", e);
      }
    }
    return paymentSessionData;
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    try {
      const id = (paymentSessionData as unknown as Orders.RazorpayOrder)
        .id as string;
      const intent = await this.razorpay_.orders.fetch(id);
      return intent as unknown as PaymentProcessorSessionResponse["session_data"];
    } catch (e) {
      return this.buildError("An error occurred in retrievePayment", e);
    }
  }

  async updatePayment(
    context: PaymentProcessorContext
  ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse | void> {
    const { amount, customer, paymentSessionData, currency_code } = context;
    const razorpayId = customer?.metadata?.razorpay_id;

    if (razorpayId !== (paymentSessionData?.customer as any)?.id) {
      const result = await this.initiatePayment(context);
      if (isPaymentProcessorError(result)) {
        return this.buildError(
          "An error occurred in updatePayment during the initiate of the new payment for the new customer",
          result
        );
      }

      return result;
    } else {
      if (!amount && !currency_code) {
        return;
      }

      try {
        const id = paymentSessionData.id as string;
        const sessionOrderData = (await this.razorpay_.orders.fetch(
          id
        )) as Partial<Orders.RazorpayOrder>;
        delete sessionOrderData.id;
        delete sessionOrderData.created_at;

        context.currency_code =
          currency_code?.toUpperCase() ?? sessionOrderData.currency!;
        const newPaymentSessionOrder = (await this.initiatePayment(
          context
        )) as PaymentProcessorSessionResponse;

        /* const sessionData = await this.razorpay_.orders.edit(
          newPaymentSessionOrder.session_data.id,
          {
            notes: {
              updated: "true",
              amount: Math.round(amount),
            },
          }
        );*/

        return { session_data: { ...newPaymentSessionOrder.session_data } };
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
      if (data.amount || data.currency) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Cannot update amount, use updatePayment instead"
        );
      }
      const paymentSession = await this.razorpay_.payments.fetch(sessionId);
      if (data.notes) {
        const result = (await this.razorpay_.orders.edit(sessionId, {
          notes: { ...paymentSession.notes, ...data.notes },
        })) as unknown as PaymentProcessorSessionResponse["session_data"];
        return result;
      } else {
        return paymentSession as unknown as PaymentProcessorSessionResponse["session_data"];
      }
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

  constructWebhookEvent(data, signature): boolean {
    return Razorpay.validateWebhookSignature(
      data,
      signature,
      this.options_.webhook_secret
    );
  }

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
