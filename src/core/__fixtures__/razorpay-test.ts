import RazorpayBase from "../razorpay-base";
import { PaymentIntentOptions } from "../../types";

export class RazorpayTest extends RazorpayBase {
  constructor(_, options) {
    super(_, options);
  }

  get paymentIntentOptions(): PaymentIntentOptions {
    return {};
  }
}
