import { EOL } from "os";
import { RazorpayTest } from "../__fixtures__/razorpay-test";
import { PaymentIntentDataByStatus } from "../../__fixtures__/data";
import { PaymentSessionStatus } from "@medusajs/medusa";
import {
  describe,
  beforeEach,
  beforeAll,
  expect,
  jest,
  it,
} from "@jest/globals";
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
} from "../../__mocks__/razorpay";
import { ErrorIntentStatus } from "../../types";

const container = {};

describe("RazorpayTest", () => {
  describe("getPaymentStatus", function () {
    let razorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, {
        key_id: "test",
        key_secret: "test",
        razorpay_account: "test",
      });
      await razorpayTest.init();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return the correct status", async () => {
      let status: PaymentSessionStatus;

      status = await razorpayTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.REQUIRES_PAYMENT_METHOD.id,
      });
      expect(status).toBe(PaymentSessionStatus.PENDING);

      status = await razorpayTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.REQUIRES_CONFIRMATION.id,
      });
      expect(status).toBe(PaymentSessionStatus.PENDING);

      status = await razorpayTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.PROCESSING.id,
      });
      expect(status).toBe(PaymentSessionStatus.PENDING);

      status = await razorpayTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.REQUIRES_ACTION.id,
      });
      expect(status).toBe(PaymentSessionStatus.REQUIRES_MORE);

      status = await razorpayTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.CANCELED.id,
      });
      expect(status).toBe(PaymentSessionStatus.CANCELED);

      status = await razorpayTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.REQUIRES_CAPTURE.id,
      });
      expect(status).toBe(PaymentSessionStatus.AUTHORIZED);

      status = await razorpayTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
      expect(status).toBe(PaymentSessionStatus.AUTHORIZED);

      status = await razorpayTest.getPaymentStatus({
        id: "unknown-id",
      });
      expect(status).toBe(PaymentSessionStatus.PENDING);
    });
  });

  describe("initiatePayment", function () {
    let razorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed with an existing customer but no razorpay id", async () => {
      const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithExistingCustomer
      );

      expect(RazorpayMock.customers.create).toHaveBeenCalled();
      expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
        email: initiatePaymentContextWithExistingCustomer.email,
      });

      expect(RazorpayMock.paymentIntents.create).toHaveBeenCalled();
      expect(RazorpayMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          amount: initiatePaymentContextWithExistingCustomer.amount,
          currency: initiatePaymentContextWithExistingCustomer.currency_code,
          metadata: {
            resource_id: initiatePaymentContextWithExistingCustomer.resource_id,
          },
          capture_method: "manual",
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          session_data: expect.any(Object),
          update_requests: {
            customer_metadata: {
              razorpay_id: RAZORPAY_ID,
            },
          },
        })
      );
    });

    it("should succeed with an existing customer with an existing razorpay id", async () => {
      const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithExistingCustomerRazorpayId
      );

      expect(RazorpayMock.customers.create).not.toHaveBeenCalled();

      expect(RazorpayMock.paymentIntents.create).toHaveBeenCalled();
      expect(RazorpayMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          amount: initiatePaymentContextWithExistingCustomer.amount,
          currency: initiatePaymentContextWithExistingCustomer.currency_code,
          metadata: {
            resource_id: initiatePaymentContextWithExistingCustomer.resource_id,
          },
          capture_method: "manual",
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          session_data: expect.any(Object),
          update_requests: undefined,
        })
      );
    });

    it("should fail on customer creation", async () => {
      const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithWrongEmail
      );

      expect(RazorpayMock.customers.create).toHaveBeenCalled();
      expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
        email: initiatePaymentContextWithWrongEmail.email,
      });

      expect(RazorpayMock.paymentIntents.create).not.toHaveBeenCalled();

      expect(result).toEqual({
        error:
          "An error occurred in initiatePayment when creating a Razorpay customer",
        code: "",
        detail: "Error",
      });
    });

    it("should fail on payment intents creation", async () => {
      const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithFailIntentCreation
      );

      expect(RazorpayMock.customers.create).toHaveBeenCalled();
      expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
        email: initiatePaymentContextWithFailIntentCreation.email,
      });

      expect(RazorpayMock.paymentIntents.create).toHaveBeenCalled();
      expect(RazorpayMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            initiatePaymentContextWithFailIntentCreation.context
              .payment_description,
          amount: initiatePaymentContextWithFailIntentCreation.amount,
          currency: initiatePaymentContextWithFailIntentCreation.currency_code,
          metadata: {
            resource_id:
              initiatePaymentContextWithFailIntentCreation.resource_id,
          },
          capture_method: "manual",
        })
      );

      expect(result).toEqual({
        error:
          "An error occurred in InitiatePayment during the creation of the razorpay payment intent",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("authorizePayment", function () {
    let razorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.authorizePayment(
        authorizePaymentSuccessData
      );

      expect(result).toEqual({
        data: authorizePaymentSuccessData,
        status: PaymentSessionStatus.AUTHORIZED,
      });
    });
  });

  describe("cancelPayment", function () {
    let razorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.cancelPayment(cancelPaymentSuccessData);

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
    });

    it("should fail on intent cancellation but still return the intent", async () => {
      const result = await razorpayTest.cancelPayment(
        cancelPaymentPartiallyFailData
      );

      expect(result).toEqual({
        id: PARTIALLY_FAIL_INTENT_ID,
        status: ErrorIntentStatus.CANCELED,
      });
    });

    it("should fail on intent cancellation", async () => {
      const result = await razorpayTest.cancelPayment(cancelPaymentFailData);

      expect(result).toEqual({
        error: "An error occurred in cancelPayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("capturePayment", function () {
    let razorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.capturePayment(
        capturePaymentContextSuccessData.paymentSessionData
      );

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
    });

    it("should fail on intent capture but still return the intent", async () => {
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
    });
  });

  describe("deletePayment", function () {
    let razorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.cancelPayment(deletePaymentSuccessData);

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
    });

    it("should fail on intent cancellation but still return the intent", async () => {
      const result = await razorpayTest.cancelPayment(
        deletePaymentPartiallyFailData
      );

      expect(result).toEqual({
        id: PARTIALLY_FAIL_INTENT_ID,
        status: ErrorIntentStatus.CANCELED,
      });
    });

    it("should fail on intent cancellation", async () => {
      const result = await razorpayTest.cancelPayment(deletePaymentFailData);

      expect(result).toEqual({
        error: "An error occurred in cancelPayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("refundPayment", function () {
    let razorpayTest;
    const refundAmount = 500;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.refundPayment(
        refundPaymentSuccessData,
        refundAmount
      );

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
    });

    it("should fail on refund creation", async () => {
      const result = await razorpayTest.refundPayment(
        refundPaymentFailData,
        refundAmount
      );

      expect(result).toEqual({
        error: "An error occurred in refundPayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("retrievePayment", function () {
    let razorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await razorpayTest.retrievePayment(
        retrievePaymentSuccessData
      );

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
        status: PaymentIntentDataByStatus.SUCCEEDED.status,
      });
    });

    it("should fail on refund creation", async () => {
      const result = await razorpayTest.retrievePayment(
        retrievePaymentFailData
      );

      expect(result).toEqual({
        error: "An error occurred in retrievePayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("updatePayment", function () {
    let razorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed to initiate a payment with an existing customer but no razorpay id", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextWithExistingCustomer
      );

      expect(RazorpayMock.customers.create).toHaveBeenCalled();
      expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
        email: updatePaymentContextWithExistingCustomer.email,
      });

      expect(RazorpayMock.paymentIntents.create).toHaveBeenCalled();
      expect(RazorpayMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          amount: updatePaymentContextWithExistingCustomer.amount,
          currency: updatePaymentContextWithExistingCustomer.currency_code,
          metadata: {
            resource_id: updatePaymentContextWithExistingCustomer.resource_id,
          },
          capture_method: "manual",
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          session_data: expect.any(Object),
          update_requests: {
            customer_metadata: {
              razorpay_id: RAZORPAY_ID,
            },
          },
        })
      );
    });

    it("should fail to initiate a payment with an existing customer but no razorpay id", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextWithWrongEmail
      );

      expect(RazorpayMock.customers.create).toHaveBeenCalled();
      expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
        email: updatePaymentContextWithWrongEmail.email,
      });

      expect(RazorpayMock.paymentIntents.create).not.toHaveBeenCalled();

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

      expect(RazorpayMock.paymentIntents.update).not.toHaveBeenCalled();

      expect(result).not.toBeDefined();
    });

    it("should succeed to update the intent with the new amount", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextWithDifferentAmount
      );

      expect(RazorpayMock.paymentIntents.update).toHaveBeenCalled();
      expect(RazorpayMock.paymentIntents.update).toHaveBeenCalledWith(
        updatePaymentContextWithDifferentAmount.paymentSessionData.id,
        {
          amount: updatePaymentContextWithDifferentAmount.amount,
        }
      );

      expect(result).toEqual({
        session_data: expect.objectContaining({
          amount: updatePaymentContextWithDifferentAmount.amount,
        }),
      });
    });

    it("should fail to update the intent with the new amount", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextFailWithDifferentAmount
      );

      expect(RazorpayMock.paymentIntents.update).toHaveBeenCalled();
      expect(RazorpayMock.paymentIntents.update).toHaveBeenCalledWith(
        updatePaymentContextFailWithDifferentAmount.paymentSessionData.id,
        {
          amount: updatePaymentContextFailWithDifferentAmount.amount,
        }
      );

      expect(result).toEqual({
        error: "An error occurred in updatePayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("updatePaymentData", function () {
    let razorpayTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      razorpayTest = new RazorpayTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed to update the payment data", async () => {
      const result = await razorpayTest.updatePaymentData(
        updatePaymentDataWithoutAmountData.sessionId,
        { ...updatePaymentDataWithoutAmountData, sessionId: undefined }
      );

      expect(RazorpayMock.paymentIntents.update).toHaveBeenCalled();
      expect(RazorpayMock.paymentIntents.update).toHaveBeenCalledWith(
        updatePaymentDataWithoutAmountData.sessionId,
        {
          customProp: updatePaymentDataWithoutAmountData.customProp,
        }
      );

      expect(result).toEqual(
        expect.objectContaining({
          customProp: updatePaymentDataWithoutAmountData.customProp,
        })
      );
    });

    it("should fail to update the payment data if the amount is present", async () => {
      const result = await razorpayTest.updatePaymentData(
        updatePaymentDataWithAmountData.sessionId,
        { ...updatePaymentDataWithAmountData, sessionId: undefined }
      );

      expect(RazorpayMock.paymentIntents.update).not.toHaveBeenCalled();

      expect(result).toEqual({
        error: "An error occurred in updatePaymentData",
        code: undefined,
        detail: "Cannot update amount, use updatePayment instead",
      });
    });
  });
});
