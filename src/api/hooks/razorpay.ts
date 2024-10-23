import Razorpay from "razorpay";
import { Logger } from "@medusajs/medusa";
import _ from "lodash";
export default async (req, res) => {
  const webhookSignature = req.headers["x-razorpay-signature"];

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const logger = req.scope.resolve("logger") as Logger;
  let data;
  if (_.isObject(req.body)) {
    logger.info(
      `Received Razorpay webhook body as object : ${JSON.stringify(req.body)}`
    );
    try {
      const validationResponse = Razorpay.validateWebhookSignature(
        req.rawBody ?? req.body.data ?? req.body,
        webhookSignature,
        webhookSecret!
      );
      // return if validation fails
      if (!validationResponse) {
        res.sendStatus(400);
        return;
      }
      data = req.body?.toString();
      if (_.isString(data)) {
        data = JSON.parse(data);
      }
    } catch (error) {
      logger.error(`Razorpay webhook validation failed : ${error}`);
      res.sendStatus(500);
      return;
    }
  } else {
    logger.info(
      `Received Razorpay webhook body : ${req.body} rawBody : ${req.rawBody}`
    );
    try {
      const validationResponse = Razorpay.validateWebhookSignature(
        req.rawBody ?? req.body,
        webhookSignature,
        webhookSecret!
      );
      // return if validation fails
      if (!validationResponse) {
        res.sendStatus(400);
        return;
      }
    } catch (error) {
      logger.error(`Razorpay webhook validation failed : ${error}`);
      res.sendStatus(500);
      return;
    }
    data = JSON.parse(req.body);
  }

  const event = data.event;

  const cartId =
    data.payload.payment.entity.notes.cart_id ??
    data.payload.payment.entity.notes.resource_id;

  // const razorpayProviderService = req.scope.resolve('pp_razorpay');
  const orderService = req.scope.resolve("orderService");

  const order = await orderService
    .retrieveByCartId(cartId)
    .catch(() => undefined);

  switch (event) {
    // payment authorization is handled in checkout flow. webhook not needed
    // case 'payment.authorized':
    //   break

    case "payment.failed":
      // TODO: notify customer of failed payment
      if (order) {
        await orderService.update(order._id, {
          status: "requires_action",
        });
      }
      break;

    // Order is not yet created in Medusa when webhook fires the first time.
    // Therefore we send 404 response to trigger Razorpay retry
    case "payment.captured":
      if (order && order.payment_status !== "captured") {
        await orderService.capturePayment(order.id);
      } else {
        return res.sendStatus(404);
      }
      break;

    default:
      res.sendStatus(204);
      return;
  }

  res.sendStatus(200);
};
