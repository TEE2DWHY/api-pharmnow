import mongoose from "mongoose";

export interface IProduct extends mongoose.Document {
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  stockQuantity: number;
  stockStatus: "in_stock" | "out_of_stock" | "low_stock";
  isPrescriptionRequired: boolean;
  pharmacyId: mongoose.Types.ObjectId;
  tier: "starter" | "next_rated" | "premium";
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new mongoose.Schema<IProduct>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+\.(jpg|jpeg|png)$/.test(v);
        },
        message: (props: any) =>
          `${props.value} must be a valid HTTP/HTTPS URL ending with .jpg, .jpeg, or .png`,
      },
    },
    category: { type: String, required: true },
    stockQuantity: { type: Number, required: true, min: 0 },
    stockStatus: {
      type: String,
      enum: ["in_stock", "out_of_stock", "low_stock"],
      default: "in_stock",
    },
    isPrescriptionRequired: { type: Boolean, default: false },
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
    },
    tier: {
      type: String,
      enum: ["starter", "next_rated", "premium"],
      default: "starter",
    },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model<IProduct>("Product", productSchema);
