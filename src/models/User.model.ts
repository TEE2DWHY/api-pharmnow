import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  fullname: string;
  email: string;
  phonenumber: string;
  deliveryAddress: string;
  isVerified: boolean;
  password: string;
  favouritePharmacies: mongoose.Types.ObjectId[];
  favouriteProducts: mongoose.Types.ObjectId[];
  cardDetails: {
    cardNumber: string;
    cardHolderName: string;
    expiryDate: string;
    cvv: string;
  };
  orders: mongoose.Types.ObjectId[];
  blockedPharmacies: mongoose.Types.ObjectId[];
  blockedByPharmacies: mongoose.Types.ObjectId[];
  verificationCode?: string;
  resetPasswordCode?: string;
  resetPasswordExpires?: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phonenumber: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    password: { type: String, required: true },
    favouritePharmacies: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
    ],
    favouriteProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    cardDetails: {
      cardNumber: { type: String, required: true },
      cardHolderName: { type: String, required: true },
      expiryDate: { type: String, required: true },
      cvv: { type: String, required: true },
    },
    verificationCode: { type: String },
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Number },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    blockedPharmacies: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
    ],
    blockedByPharmacies: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
    ],
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", userSchema);
