import RazorpayBase from "../razorpay-base";
import { PaymentIntentOptions, RazorpayOptions } from "../../types";

export class RazorpayTest extends RazorpayBase {
  constructor(_, options: RazorpayOptions) {
    super(_, options);
  }

  get paymentIntentOptions(): PaymentIntentOptions {
    return {};
  }
}
