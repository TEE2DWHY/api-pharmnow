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
  medications: mongoose.Types.ObjectId[];
  medicationSettings?: {
    enableReminders: boolean;
    defaultReminderTime: string;
    snoozeMinutes: number;
  };
  verificationCode?: string;
  verificationCodeExpires?: number;
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
    deliveryAddress: { type: String },
    isVerified: { type: Boolean, default: false },
    password: { type: String, required: true },
    favouritePharmacies: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
    ],
    favouriteProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    cardDetails: {
      cardNumber: { type: String },
      cardHolderName: { type: String },
      expiryDate: { type: String },
      cvv: { type: String },
    },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    blockedPharmacies: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
    ],
    blockedByPharmacies: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
    ],
    medications: [{ type: mongoose.Schema.Types.ObjectId, ref: "Medication" }],
    medicationSettings: {
      enableReminders: { type: Boolean, default: true },
      defaultReminderTime: { type: String, default: "08:00" },
      snoozeMinutes: { type: Number, default: 15 },
    },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Number },
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Number },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
