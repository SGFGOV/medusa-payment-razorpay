export const PaymentIntentDataByStatus = {
  CREATED: {
    id: "created",
    status: "requires_more",
  },

  ATTEMPTED: {
    id: "attempted",
    status: "attempted",
    payments: {
      count: 1,
      items: [{ id: "this is a test" }],
    },
  },
  PAID: {
    id: "paid",
    status: "paid",
    payments: {
      count: 1,
      items: [{ id: "this is a test", status: "authorized" }],
    },
  },
};
