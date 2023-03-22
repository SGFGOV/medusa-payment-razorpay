import { validateWebhookSignature } from "razorpay"

export default async (req, res) => {
  //console.log('razorpay wh req.rawBody', req.rawBody);
  //console.log('razorpay wh req.body', req.body);

  const webhookSignature = req.headers["x-razorpay-signature"];

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const validationResponse = validateWebhookSignature(req.rawBody, webhookSignature, webhookSecret);

  //return if validation fails
  if (!validationResponse) {
    return;
  }

  const event = req.body.event;

  const cartId = req.body.payload.payment.entity.notes.cart_id;

  //const razorpayProviderService = req.scope.resolve('pp_razorpay');
  const orderService = req.scope.resolve("orderService");

  const order = await orderService.retrieveByCartId(cartId).catch(() => undefined);

  // console.log('event', event);
  // console.log('order', order);

  switch (event) {
    // payment authorization is handled in checkout flow. webhook not needed
    // case 'payment.authorized':
    //   break

    case "payment.failed":
      //TODO: notify customer of failed payment
      if (order) {
        await orderService.update(order._id, {
          status: "requires_action",
        });
      };
      break

    //Order is not yet created in Medusa when webhook fires the first time.
    //Therefore we send 404 response to trigger Razorpay retry
    case "payment.captured":
      if (order && order.payment_status !== "captured") {
        await orderService.capturePayment(order.id);
      } else {
        return res.sendStatus(404);
      }
      break

    default:
      res.sendStatus(204);
      return
  }

  res.sendStatus(200);
};


// req.body = {
//   entity: 'event',
//   account_id: 'acc_LRKR9N2gBC0ezZ',
//   event: 'payment.authorized',
//   contains: ['payment'],
//   payload: {
//     payment: {
//       entity: {
//         id: 'pay_LUahpVBO47saCl',
//         entity: 'payment',
//         amount: 214900,
//         currency: 'INR',
//         status: 'authorized',
//         order_id: 'order_LUahZlqYrBboBZ',
//         invoice_id: null,
//         international: false,
//         method: 'card',
//         amount_refunded: 0,
//         refund_status: null,
//         captured: false,
//         description: 'Order No: order_LUahZlqYrBboBZ',
//         card_id: 'card_LUahpYeDtgqVRI',
//         card: {
//           id: 'card_LUahpYeDtgqVRI',
//           entity: 'card',
//           name: '',
//           last4: '5449',
//           network: 'MasterCard',
//           type: 'credit',
//           issuer: 'UTIB',
//           international: false,
//           emi: false,
//           sub_type: 'consumer',
//           token_iin: null,
//         },
//         bank: null,
//         wallet: null,
//         vpa: null,
//         email: 'abc@xyz.com',
//         contact: '+91XXXXXXXXXX',
//         notes: {
//           cart_id: 'cart_01GW4S0F9KQK414ZEFH4NTNYJV',
//           customer: 'cust_LRQCbsXDFTy0Mk',
//         },
//         fee: null,
//         tax: null,
//         error_code: null,
//         error_description: null,
//         error_source: null,
//         error_step: null,
//         error_reason: null,
//         acquirer_data: {
//           auth_code: '377689',
//         },
//         created_at: 1679492688,
//       },
//     },
//   },
//   created_at: 1679492691,
// }