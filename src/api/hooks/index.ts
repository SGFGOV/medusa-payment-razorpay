import razorpayHooks from "./razorpay";
import { Router } from "express";
import bodyParser from "body-parser";
import { wrapHandler } from "@medusajs/medusa";

const route = Router();

export default (app) => {
  app.use("/razorpay", route);

  route.post(
    "/hooks",
    // razorpay constructEvent fails without body-parser
    bodyParser.raw({ type: "application/json" }),
    wrapHandler(razorpayHooks)
  );
  return app;
};
