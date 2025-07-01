import mongoose from "mongoose";

export interface IOrderProduct {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  priceAtTime: number;
}

export interface IOrderReview {
  rating?: number;
  comment?: string;
  createdAt?: Date;
}

export interface IOrder extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  pharmacyId: mongoose.Types.ObjectId;
  products: IOrderProduct[];
  totalPrice: number;
  status:
    | "pending"
    | "confirmed"
    | "declined"
    | "preparing"
    | "ready_for_pickup"
    | "picked_up"
    | "shipped"
    | "delivered"
    | "cancelled";
  orderCode: string;
  deliveryAddress: string;
  deliveryType: "pickup" | "delivery";
  paymentMethod: "credit_card" | "transfer" | "cash_on_delivery";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  review?: IOrderReview;
  notes?: string;
  cancellationReason?: string;
  declineReason?: string;
  cancelledBy?: "user" | "pharmacy" | "system";
  createdAt: Date;
  updatedAt: Date;

  canBeCancelled(): boolean;
  canBeDeclined(): boolean;
  canBeReviewed(): boolean;
  isReadyForDelivery(): boolean;
  isFinalStatus(): boolean;
}

const orderSchema = new mongoose.Schema<IOrder>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
      index: true,
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
        priceAtTime: {
          type: Number,
          required: true,
          min: [0, "Price cannot be negative"],
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
      enum: [
        "pending",
        "confirmed",
        "declined",
        "preparing",
        "ready_for_pickup",
        "picked_up",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
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
    deliveryType: {
      type: String,
      enum: ["pickup", "delivery"],
      default: "delivery",
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "transfer", "cash_on_delivery"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
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
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      trim: true,
    },
    cancellationReason: {
      type: String,
      maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
      trim: true,
    },
    declineReason: {
      type: String,
      maxlength: [500, "Decline reason cannot exceed 500 characters"],
      trim: true,
    },
    cancelledBy: {
      type: String,
      enum: ["user", "pharmacy", "system"],
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ pharmacyId: 1, createdAt: -1 });
orderSchema.index({ pharmacyId: 1, status: 1 });

orderSchema.pre<IOrder>("save", function (next) {
  if (this.isNew && !this.estimatedDelivery) {
    const days = this.deliveryType === "pickup" ? 1 : 3;
    this.estimatedDelivery = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  next();
});

orderSchema.methods.canBeCancelled = function () {
  return ["pending", "confirmed"].includes(this.status);
};

orderSchema.methods.canBeDeclined = function () {
  return this.status === "pending";
};

orderSchema.methods.canBeReviewed = function () {
  return this.status === "delivered" && !this.review?.rating;
};

orderSchema.methods.isReadyForDelivery = function () {
  return ["ready_for_pickup", "shipped"].includes(this.status);
};

orderSchema.methods.isFinalStatus = function () {
  return ["delivered", "cancelled", "declined"].includes(this.status);
};

const Order = mongoose.model<IOrder>("Order", orderSchema);
export default Order;
