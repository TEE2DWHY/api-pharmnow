import mongoose from "mongoose";

export interface IOrderProduct {
  productId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IOrderReview {
  rating?: number;
  comment?: string;
}

export interface IOrder extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  pharmacyId: mongoose.Types.ObjectId;
  products: IOrderProduct[];
  totalPrice: number;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "picked_up"
    | "shipped"
    | "delivered"
    | "cancelled";
  orderCode: string;
  deliveryAddress: string;
  paymentMethod: "credit_card" | "transfer";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  review?: IOrderReview;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new mongoose.Schema<IOrder>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price cannot be negative"],
    },
    status: {
      type: String,
      enum: {
        values: [
          "pending",
          "confirmed",
          "preparing",
          "picked_up",
          "shipped",
          "delivered",
          "cancelled",
        ],
        message: "Invalid order status",
      },
      default: "pending",
    },
    orderCode: {
      type: String,
      required: true,
      unique: true,
      default: function () {
        return `ORD-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 6)
          .toUpperCase()}`;
      },
    },
    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ["credit_card", "transfer"],
        message: "Invalid payment method",
      },
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ["pending", "paid", "failed", "refunded"],
        message: "Invalid payment status",
      },
      default: "pending",
    },
    estimatedDelivery: {
      type: Date,
    },
    actualDelivery: {
      type: Date,
    },
    review: {
      rating: {
        type: Number,
        min: [1, "Rating must be between 1 and 5"],
        max: [5, "Rating must be between 1 and 5"],
      },
      comment: {
        type: String,
        maxlength: [500, "Review comment cannot exceed 500 characters"],
        trim: true,
      },
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
