import {
  EXISTING_CUSTOMER_EMAIL,
  FAIL_INTENT_ID,
  PARTIALLY_FAIL_INTENT_ID,
  RAZORPAY_ID,
  WRONG_CUSTOMER_EMAIL,
  isMocksEnabled,
} from "../../__mocks__/razorpay";
import { PaymentIntentDataByStatus } from "../../__fixtures__/data";

// INITIATE PAYMENT DATA

export const initiatePaymentContextWithExistingCustomer = {
  email: EXISTING_CUSTOMER_EMAIL,
  phone: "9876542321",
  currency_code: "inr",
  amount: 1000,
  resource_id: "test",
  customer: { last_name: "test", first_name: "customer", phone: "9876542321" },
  context: {},
  paymentSessionData: {},
};

export const initiatePaymentContextWithExistingCustomerRazorpayId = {
  email: EXISTING_CUSTOMER_EMAIL,

  currency_code: "inr",
  amount: 1000,
  resource_id: "test",
  customer: {
    phone: "9876542321",
    last_name: "test",
    first_name: "customer",
    metadata: {
      razorpay_id: isMocksEnabled() ? "test" : undefined,
    },
  },
  context: {},
  paymentSessionData: {},
};

export const initiatePaymentContextWithWrongEmail = {
  email: WRONG_CUSTOMER_EMAIL,
  currency_code: "inr",
  amount: 1000,
  resource_id: "test",
  customer: { last_name: "test", first_name: "customer" },
  context: {},
  paymentSessionData: {},
};

export const initiatePaymentContextWithFailIntentCreation = {
  email: EXISTING_CUSTOMER_EMAIL,
  currency_code: "inr",
  amount: 1000,
  resource_id: "test",
  customer: { last_name: "test", first_name: "customer" },
  context: {
    payment_description: "fail",
  },
  paymentSessionData: {},
};

// AUTHORIZE PAYMENT DATA

export const authorizePaymentSuccessData = {
  id: PaymentIntentDataByStatus.ATTEMPTED.id,
};

// CANCEL PAYMENT DATA

export const cancelPaymentSuccessData = {
  id: PaymentIntentDataByStatus.ATTEMPTED.id,
};

export const cancelPaymentFailData = {
  id: FAIL_INTENT_ID,
};

export const cancelPaymentPartiallyFailData = {
  id: PARTIALLY_FAIL_INTENT_ID,
};

// CAPTURE PAYMENT DATA

export const capturePaymentContextSuccessData = {
  paymentSessionData: {
    id: PaymentIntentDataByStatus.ATTEMPTED.id,
  },
};

export const capturePaymentContextFailData = {
  paymentSessionData: {
    id: FAIL_INTENT_ID,
  },
};

export const capturePaymentContextPartiallyFailData = {
  paymentSessionData: {
    id: PARTIALLY_FAIL_INTENT_ID,
  },
};

// DELETE PAYMENT DATA

export const deletePaymentSuccessData = {
  id: PaymentIntentDataByStatus.ATTEMPTED.id,
};

export const deletePaymentFailData = {
  id: FAIL_INTENT_ID,
};

export const deletePaymentPartiallyFailData = {
  id: PARTIALLY_FAIL_INTENT_ID,
};

// REFUND PAYMENT DATA

export const refundPaymentSuccessData = {
  sessionid: PaymentIntentDataByStatus.ATTEMPTED.id,
};

export const refundPaymentFailData = {
  id: FAIL_INTENT_ID,
};

// RETRIEVE PAYMENT DATA

export const retrievePaymentSuccessData = {
  id: PaymentIntentDataByStatus.ATTEMPTED.id,
};

export const retrievePaymentFailData = {
  id: FAIL_INTENT_ID,
};

// UPDATE PAYMENT DATA

export const updatePaymentContextWithExistingCustomer = {
  email: EXISTING_CUSTOMER_EMAIL,
  currency_code: "inr",
  amount: 1000,
  resource_id: "test",
  customer: {},
  context: {},
  paymentSessionData: {
    customer: "test",
    amount: 1000,
  },
};

export const updatePaymentContextWithExistingCustomerRazorpayId = {
  email: EXISTING_CUSTOMER_EMAIL,
  currency_code: "inr",
  amount: 1000,
  resource_id: "test",
  customer: {
    metadata: {
      razorpay_id: "test",
    },
  },
  context: {},
  paymentSessionData: {
    customer: "test",
    amount: 1000,
  },
};

export const updatePaymentContextWithWrongEmail = {
  email: WRONG_CUSTOMER_EMAIL,
  currency_code: "inr",
  amount: 1000,
  resource_id: "test",
  customer: {},
  context: {},
  paymentSessionData: {
    customer: "test",
    amount: 1000,
  },
};

export const updatePaymentContextWithDifferentAmount = {
  email: WRONG_CUSTOMER_EMAIL,
  currency_code: "inr",
  amount: 2000,
  resource_id: "test",
  customer: {
    metadata: {
      razorpay_id: "test",
    },
  },
  context: {},
  paymentSessionData: {
    id: PaymentIntentDataByStatus.ATTEMPTED.id,
    customer: "test",
    amount: 1000,
  },
};

export const updatePaymentContextFailWithDifferentAmount = {
  email: WRONG_CUSTOMER_EMAIL,
  currency_code: "inr",
  amount: 2000,
  resource_id: "test",
  customer: {
    metadata: {
      razorpay_id: "test",
    },
  },
  context: {
    metadata: {
      razorpay_id: "test",
    },
  },
  paymentSessionData: {
    id: FAIL_INTENT_ID,
    customer: "test",
    amount: 1000,
  },
};

export const updatePaymentDataWithAmountData = {
  sessionId: RAZORPAY_ID,
  amount: 2000,
};

export const updatePaymentDataWithoutAmountData = {
  sessionId: RAZORPAY_ID,

  /** only notes can be updated */
  notes: {
    customProp: "test",
    test: "test-string",
  },
};
