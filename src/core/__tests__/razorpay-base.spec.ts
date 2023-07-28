import { EOL } from "os";
import { RazorpayTest } from "../__fixtures__/razorpay-test";
import { PaymentIntentDataByStatus } from "../../__fixtures__/data";
import {
  PaymentProcessorContext,
  PaymentProcessorSessionResponse,
  PaymentSessionStatus,
} from "@medusajs/medusa";
import {
  describe,
  beforeEach,
  beforeAll,
  expect,
  jest,
  it,
} from "@jest/globals";
import dotenv from "dotenv";
import {
  authorizePaymentSuccessData,
  cancelPaymentFailData,
  cancelPaymentPartiallyFailData,
  cancelPaymentSuccessData,
  capturePaymentContextFailData,
  capturePaymentContextPartiallyFailData,
  capturePaymentContextSuccessData,
  deletePaymentFailData,
  deletePaymentPartiallyFailData,
  deletePaymentSuccessData,
  initiatePaymentContextWithExistingCustomer,
  initiatePaymentContextWithExistingCustomerRazorpayId,
  initiatePaymentContextWithFailIntentCreation,
  initiatePaymentContextWithWrongEmail,
  refundPaymentFailData,
  refundPaymentSuccessData,
  retrievePaymentFailData,
  retrievePaymentSuccessData,
  updatePaymentContextFailWithDifferentAmount,
  updatePaymentContextWithDifferentAmount,
  updatePaymentContextWithExistingCustomer,
  updatePaymentContextWithExistingCustomerRazorpayId,
  updatePaymentContextWithWrongEmail,
  updatePaymentDataWithAmountData,
  updatePaymentDataWithoutAmountData,
} from "../__fixtures__/data";
import {
  PARTIALLY_FAIL_INTENT_ID,
  RAZORPAY_ID,
  RazorpayMock,
  isMocksEnabled,
} from "../../__mocks__/razorpay";
import { ErrorCodes, ErrorIntentStatus, RazorpayOptions } from "../../types";
let config: RazorpayOptions = {
  key_id: "test",
  key_secret: "test",
  razorpay_account: "test",
  automatic_expiry_period: 30,
  manual_expiry_period: 20,
  refund_speed: "normal",
  webhook_secret: "test",
};
if (!isMocksEnabled()) {
  dotenv.config();
}
const container = {};
config = {
  ...config,
  key_id: process.env.RAZORPAY_ID!,
  key_secret: process.env.RAZORPAY_SECRET!,
  razorpay_account: process.env.RAZORPAY_ACCOUNT!,
};
let testPaymentSession;
let razorpayTest: RazorpayTest;
describe("RazorpayTest", () => {
  describe("getPaymentStatus", function () {
    beforeAll(async () => {
      if (!isMocksEnabled()) {
        jest.requireActual("razorpay");
      }

      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, config);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    if (isMocksEnabled()) {
      it("should return the correct status", async () => {
        let status: PaymentSessionStatus;

        status = await razorpayTest.getPaymentStatus({
          id: PaymentIntentDataByStatus.CREATED.id,
        });
        expect(status).toBe(PaymentSessionStatus.PENDING);

        status = await razorpayTest.getPaymentStatus({
          id: PaymentIntentDataByStatus.CREATED.id,
        });
        expect(status).toBe(PaymentSessionStatus.PENDING);

        expect(status).toBe(PaymentSessionStatus.PENDING);

        status = await razorpayTest.getPaymentStatus({
          id: PaymentIntentDataByStatus.ATTEMPTED.id,
        });
        expect(status).toBe(PaymentSessionStatus.AUTHORIZED);

        status = await razorpayTest.getPaymentStatus({
          id: "unknown-id",
        });
        expect(status).toBe(PaymentSessionStatus.PENDING);
      });
    } else {
      it("should return the correct status", async () => {
        const result = await razorpayTest.initiatePayment(
          initiatePaymentContextWithExistingCustomer as any
        );

        const status = await razorpayTest.getPaymentStatus(
          (result as PaymentProcessorSessionResponse).session_data
        );
        expect(status).toBe(PaymentSessionStatus.REQUIRES_MORE);
      });
    }
  });

  describe("initiatePayment", function () {
    let razorpayTest: RazorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, config);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed with an existing customer but no razorpay id", async () => {
      const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithExistingCustomer as any
      );

      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).toHaveBeenCalled();

        /* expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
        email: initiatePaymentContextWithExistingCustomer.email,
        name: "test, customer",
      });*/

        expect(RazorpayMock.orders.create).toHaveBeenCalled();
        /* expect(RazorpayMock.orders.create).toHaveBeenCalledWith(
          expect.objectContaining({
            description: undefined,
            amount: initiatePaymentContextWithExistingCustomer.amount,
            currency: initiatePaymentContextWithExistingCustomer.currency_code,
            notes: {
              resource_id:
                initiatePaymentContextWithExistingCustomer.resource_id,
            },
            capture_method: "manual",
          })
        );*/
      }

      expect(result).toEqual(
        expect.objectContaining({
          session_data: expect.any(Object),
          update_requests: {
            customer_metadata: {
              razorpay_id: isMocksEnabled()
                ? RAZORPAY_ID
                : expect.stringContaining("cus"),
            },
          },
        })
      );
    });

    it("should succeed with an existing customer with an existing razorpay id", async () => {
      const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithExistingCustomerRazorpayId as any
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).not.toHaveBeenCalled();

        expect(RazorpayMock.orders.create).toHaveBeenCalled();
        /* expect(RazorpayMock.orders.create).toMatchObject({
          description: undefined,
          amount: initiatePaymentContextWithExistingCustomer.amount,
          currency: initiatePaymentContextWithExistingCustomer.currency_code,
          notes: {
            resource_id: initiatePaymentContextWithExistingCustomer.resource_id,
          },
          capture_method: "manual",
        });*/
      }
      expect(result).toMatchObject(
        !isMocksEnabled()
          ? {
              session_data: expect.any(Object),
              update_requests: expect.any(Object),
            }
          : {
              session_data: expect.any(Object),
            }
      );
      if (!isMocksEnabled()) {
        expect((result as any).session_data.id).toBeDefined();
      }
    });

    /* it("should fail on customer creation", async () => {
      /const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithWrongEmail as any
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).toHaveBeenCalled();
        expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
          email: initiatePaymentContextWithWrongEmail.email,
        });

        expect(RazorpayMock.orders.create).not.toHaveBeenCalled();
      }
      expect(result).toEqual({
        error:
          "An error occurred in initiatePayment when creating a Razorpay customer",
        code: "",
        detail: "Error",
      });
    });*/

    /* it("should fail on payment intents creation", async () => {
      const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithFailIntentCreation as any
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).toHaveBeenCalled();
        expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
          email: initiatePaymentContextWithFailIntentCreation.email,
        });

        expect(RazorpayMock.orders.create).toHaveBeenCalled();
        expect(RazorpayMock.orders.create).toHaveBeenCalledWith(
          expect.objectContaining({
            description:
              initiatePaymentContextWithFailIntentCreation.context
                .payment_description,
            amount: initiatePaymentContextWithFailIntentCreation.amount,
            currency:
              initiatePaymentContextWithFailIntentCreation.currency_code,
            notes: {
              resource_id:
                initiatePaymentContextWithFailIntentCreation.resource_id,
            },
            capture_method: "manual",
          })
        );
      }

      expect(result).toEqual({
        error:
          "An error occurred in InitiatePayment during the creation of the razorpay payment intent",
        code: "",
        detail: "Error",
      });
    });*/
  });

  describe("authorizePayment", function () {
    let razorpayTest: RazorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, config);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      if (!isMocksEnabled()) {
        testPaymentSession = await razorpayTest.initiatePayment(
          initiatePaymentContextWithExistingCustomer as any
        );
      }
      const result = await razorpayTest.authorizePayment(
        isMocksEnabled()
          ? authorizePaymentSuccessData
          : testPaymentSession.session_data
      );

      expect(result).toMatchObject({
        data: isMocksEnabled()
          ? authorizePaymentSuccessData
          : {
              id: expect.stringContaining("order_"),
            },
        status: isMocksEnabled()
          ? PaymentSessionStatus.AUTHORIZED
          : PaymentSessionStatus.REQUIRES_MORE,
      });
    });
  });

  describe("cancelPayment", function () {
    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, config);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.cancelPayment(cancelPaymentSuccessData);

      expect(result).toEqual({
        code: ErrorCodes.UNSUPPORTED_OPERATION,
        error: "Unable to cancel as razorpay doesn't support cancellation",
      });
    });

    it("should fail on intent cancellation but still return the intent", async () => {
      const result = await razorpayTest.cancelPayment(
        cancelPaymentPartiallyFailData
      );

      expect(result).toEqual({
        code: ErrorCodes.UNSUPPORTED_OPERATION,
        error: "Unable to cancel as razorpay doesn't support cancellation",
      });
    });

    it("should fail on intent cancellation", async () => {
      const result = await razorpayTest.cancelPayment(cancelPaymentFailData);

      /* expect(result).toEqual({
        error: "An error occurred in cancelPayment",
        code: "",
        detail: "Error",
      });*/
      expect(result).toEqual({
        code: ErrorCodes.UNSUPPORTED_OPERATION,
        error: "Unable to cancel as razorpay doesn't support cancellation",
      });
    });
  });

  describe("capturePayment", function () {
    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, config);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.capturePayment(
        isMocksEnabled()
          ? capturePaymentContextSuccessData.paymentSessionData
          : testPaymentSession.session_data
      );

      if (isMocksEnabled()) {
        expect(result).toEqual({
          id: PaymentIntentDataByStatus.ATTEMPTED.id,
        });
      } else {
        expect(result).toMatchObject({
          payments: expect.any(Object),
        });
      }
    });

    /* it("should fail on intent capture but still return the intent", async () => {
      const result = await razorpayTest.capturePayment(
        capturePaymentContextPartiallyFailData.paymentSessionData
      );

      expect(result).toEqual({
        id: PARTIALLY_FAIL_INTENT_ID,
        status: ErrorIntentStatus.SUCCEEDED,
      });
    });

    it("should fail on intent capture", async () => {
      const result = await razorpayTest.capturePayment(
        capturePaymentContextFailData.paymentSessionData
      );

      expect(result).toEqual({
        error: "An error occurred in capturePayment",
        code: "",
        detail: "Error",
      });
    });*/
  });

  describe("deletePayment", function () {
    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, config);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.cancelPayment(deletePaymentSuccessData);

      expect(result).toEqual({
        code: "payment_intent_operation_unsupported",
        error: "Unable to cancel as razorpay doesn't support cancellation",
      });
    });

    it("should fail on intent cancellation but still return the intent", async () => {
      const result = await razorpayTest.cancelPayment(
        deletePaymentPartiallyFailData
      );

      expect(result).toEqual({
        code: "payment_intent_operation_unsupported",
        error: "Unable to cancel as razorpay doesn't support cancellation",
      });
    });

    it("should fail on intent cancellation", async () => {
      const result = await razorpayTest.cancelPayment(deletePaymentFailData);

      expect(result).toEqual({
        code: "payment_intent_operation_unsupported",
        error: "Unable to cancel as razorpay doesn't support cancellation",
      });
    });
  });

  describe("refundPayment", function () {
    const refundAmount = 500;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, config);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.refundPayment(
        isMocksEnabled()
          ? refundPaymentSuccessData
          : testPaymentSession.session_data,
        refundAmount
      );
      if (isMocksEnabled()) {
        expect(result).toMatchObject({
          sessionid: PaymentIntentDataByStatus.ATTEMPTED.id,
        });
      } else {
        expect(result).toMatchObject({
          payments: expect.any(Object),
        });
      }
    });

    /* it("should fail on refund creation", async () => {
      const result = await razorpayTest.refundPayment(
        isMocksEnabled() ? refundPaymentFailData : testPaymentSession,
        refundAmount
      );

      expect(result).toEqual({
        error: "An error occurred in refundPayment",
        code: "",
        detail: "Error",
      });
    }); */
  });

  describe("retrievePayment", function () {
    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, config);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should retrieve", async () => {
      const result = await razorpayTest.retrievePayment(
        isMocksEnabled()
          ? retrievePaymentSuccessData
          : testPaymentSession.session_data
      );
      if (isMocksEnabled()) {
        expect(result).toMatchObject({
          status: "attempted",
        });
      } else {
        expect((result as any).id).toBeDefined();
        expect((result as any).id).toMatch("order_");
      }
    });

    /* it("should fail on refund creation", async () => {
      const result = await razorpayTest.retrievePayment(
        retrievePaymentFailData
      );

      expect(result).toEqual({
        error: "An error occurred in retrievePayment",
        code: "",
        detail: "Error",
      });
    });*/
  });

  if (!isMocksEnabled()) {
    describe("updatePayment", function () {
      if (!isMocksEnabled()) {
        beforeAll(async () => {
          const scopedContainer = { ...container };
          razorpayTest = new RazorpayTest(scopedContainer, config);
        });

        beforeEach(() => {
          jest.clearAllMocks();
        });
      }

      /* it("should succeed to initiate a payment with an existing customer but no razorpay id", async () => {
      const paymentContext: PaymentProcessorContext = {
        email: updatePaymentContextWithDifferentAmount.email,
        currency_code: updatePaymentContextWithDifferentAmount.currency_code,
        amount: updatePaymentContextWithDifferentAmount.amount,
        resource_id: updatePaymentContextWithDifferentAmount.resource_id,
        context: updatePaymentContextWithDifferentAmount.context,
        paymentSessionData: testPaymentSession.session_data,
      };
      const result = await razorpayTest.updatePayment(
        updatePaymentContextWithExistingCustomer as any
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).toHaveBeenCalled();
        expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
          email: updatePaymentContextWithExistingCustomer.email,
        });

        expect(RazorpayMock.orders.create).toHaveBeenCalled();
        expect(RazorpayMock.orders.create).toHaveBeenCalledWith(
          expect.objectContaining({
            description: undefined,
            amount: updatePaymentContextWithExistingCustomer.amount,
            currency: updatePaymentContextWithExistingCustomer.currency_code,
            notes: {
              resource_id: updatePaymentContextWithExistingCustomer.resource_id,
            },
            capture_method: "manual",
          })
        );
      }

      expect(result).toMatchObject({
        session_data: { id: expect.stringMatching("order") },
        update_requests: {
          customer_metadata: {
            razorpay_id: isMocksEnabled()
              ? RAZORPAY_ID
              : expect.stringMatching("cus"),
          },
        },
      });
    }, 60e6); */

      /* it("should fail to initiate a payment with an existing customer but no razorpay id", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextWithWrongEmail
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).toHaveBeenCalled();
        expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
          email: updatePaymentContextWithWrongEmail.email,
        });

        expect(RazorpayMock.orders.create).not.toHaveBeenCalled();
      }
      expect(result).toEqual({
        error:
          "An error occurred in updatePayment during the initiate of the new payment for the new customer",
        code: "",
        detail:
          "An error occurred in initiatePayment when creating a Razorpay customer" +
          EOL +
          "Error",
      });
    });

    it("should succeed but no update occurs when the amount did not changed", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextWithExistingCustomerRazorpayId
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.orders.edit).not.toHaveBeenCalled();
      }
      expect(result).not.toBeDefined();
    });
    */
      if (!isMocksEnabled()) {
        it("should succeed to update the intent with the new amount", async () => {
          const paymentContext: PaymentProcessorContext = {
            email: updatePaymentContextWithDifferentAmount.email,
            currency_code:
              updatePaymentContextWithDifferentAmount.currency_code,
            amount: updatePaymentContextWithDifferentAmount.amount,
            resource_id: updatePaymentContextWithDifferentAmount.resource_id,
            context: updatePaymentContextWithDifferentAmount.context,
            paymentSessionData: isMocksEnabled()
              ? updatePaymentContextWithDifferentAmount.paymentSessionData
              : testPaymentSession.session_data,
          };
          const result = await razorpayTest.updatePayment(
            isMocksEnabled()
              ? (updatePaymentContextWithDifferentAmount as any)
              : paymentContext
          );
          if (isMocksEnabled()) {
            expect(1).toBe(1);
            console.log("test not valid in mocked mode");
            // expect(RazorpayMock.orders.edit).toHaveBeenCalled();
            /* expect(RazorpayMock.orders.edit).toHaveBeenCalledWith(
          updatePaymentContextWithDifferentAmount.paymentSessionData.id,
          {
            amount: updatePaymentContextWithDifferentAmount.amount,
          }
        );*/
          }
          expect(result).toMatchObject({
            session_data: {
              amount: updatePaymentContextWithDifferentAmount.amount,
            },
          });
        }, 60e6);
      }

      /* it("should fail to update the intent with the new amount", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextFailWithDifferentAmount
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.orders.edit).toHaveBeenCalled();
        expect(RazorpayMock.orders.edit).toHaveBeenCalledWith(
          updatePaymentContextFailWithDifferentAmount.paymentSessionData.id,
          {
            amount: updatePaymentContextFailWithDifferentAmount.amount,
          }
        );
      }
      expect(result).toEqual({
        error: "An error occurred in updatePayment",
        code: "",
        detail: "Error",
      });
    });*/
    });
  }

  describe("updatePaymentData", function () {
    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, config);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed to update the payment data", async () => {
      const result = await razorpayTest.updatePaymentData(
        isMocksEnabled()
          ? updatePaymentDataWithoutAmountData.sessionId
          : (testPaymentSession.id as any),
        {
          ...updatePaymentDataWithoutAmountData,
          sessionId: isMocksEnabled() ? undefined : testPaymentSession.id,
        }
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.orders.edit).toHaveBeenCalled();
      }
    }, 60e6);

    /* it("should fail to update the payment data if the amount is present", async () => {
      const result = await razorpayTest.updatePaymentData(
        updatePaymentDataWithAmountData.sessionId,
        { ...updatePaymentDataWithAmountData, sessionId: undefined }
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.orders.edit).not.toHaveBeenCalled();
      }
      expect(result).toEqual({
        error: "An error occurred in updatePaymentData",
        code: undefined,
        detail: "Cannot update amount, use updatePayment instead",
      });
    });*/
  });
});
