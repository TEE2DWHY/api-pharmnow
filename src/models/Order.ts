import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalPrice: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["pending", "preparing", "picked_up", "shipped", "delivered"],
      default: "pending",
    },
    orderCode: {
      type: String,
      required: true,
      unique: true,
      default: () => `ORD-${Math.random().toString(36).substr(2, 9)}`,
    },
    deliveryAddress: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "transfer"],
      required: true,
    },
    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
