import mongoose from "mongoose";

export interface IPharmacyOrder extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  pharmacyId: mongoose.Types.ObjectId;
  products: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  totalPrice: number;
  status: "pending" | "preparing" | "picked_up" | "shipped" | "delivered";
  createdAt: Date;
  updatedAt: Date;
}

const pharmacyOrderSchema = new mongoose.Schema<IPharmacyOrder>(
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
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalPrice: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["pending", "preparing", "picked_up", "shipped", "delivered"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const PharmacyOrder = mongoose.model<IPharmacyOrder>(
  "PharmacyOrder",
  pharmacyOrderSchema
);

export default PharmacyOrder;
