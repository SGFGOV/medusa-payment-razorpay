export interface RazorpayOptions {
  automatic_expiry_period: number;
  manual_expiry_period: number;
  refund_speed: "normal" | "optimum";
  key_secret: string | undefined;
  razorpay_account: string | undefined;
  key_id: string;
  webhook_secret: string;
  /**
   * Use this flag to capture payment immediately (default is false)
   */
  auto_capture?: boolean;
  /**
   * set `automatic_payment_methods` to `{ enabled: true }`
   */
  automatic_payment_methods?: boolean;
  /**
   * Set a default description on the intent if the context does not provide one
   */
  payment_description?: string;
}

export interface PaymentIntentOptions {
  capture_method?: "automatic" | "manual";
  setup_future_usage?: "on_session" | "off_session";
  payment_method_types?: string[];
}

export const ErrorCodes = {
  PAYMENT_INTENT_UNEXPECTED_STATE: "payment_intent_unexpected_state",
  UNSUPPORTED_OPERATION: "payment_intent_operation_unsupported",
};

export const ErrorIntentStatus = {
  SUCCEEDED: "succeeded",
  CANCELED: "canceled",
};

export const PaymentProviderKeys = {
  RAZORPAY: "razorpay",
  BAN_CONTACT: "razorpay-bancontact",
  BLIK: "razorpay-blik",
  GIROPAY: "razorpay-giropay",
  IDEAL: "razorpay-ideal",
  PRZELEWY_24: "razorpay-przelewy24",
};
