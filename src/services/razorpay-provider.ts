import RazorpayBase from "../core/razorpay-base";
import { PaymentIntentOptions, PaymentProviderKeys } from "../types";

class RazorpayProviderService extends RazorpayBase {
  static identifier = PaymentProviderKeys.RAZORPAY;

  constructor(_, options) {
    super(_, options);
  }

  get paymentIntentOptions(): PaymentIntentOptions {
    return {};
  }
}

export default RazorpayProviderService;
