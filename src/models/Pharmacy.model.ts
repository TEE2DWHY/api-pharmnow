import mongoose from "mongoose";

export interface IPharmacy extends mongoose.Document {
  name: string;
  location: string;
  contactNumber: string;
  email: string;
  password: string;
  phonenumber: string;
  referralCode?: string;
  isVerified: boolean;
  products: mongoose.Types.ObjectId[];
  pcnNumber: string;
  licenseDocument: string;
  logo: string;
  blockedUsers: mongoose.Types.ObjectId[];
  blockedByUsers: mongoose.Types.ObjectId[];
  verificationCode?: string;
  verificationCodeExpires?: number;
  resetPasswordCode?: string;
  resetPasswordExpires?: number;
  createdAt: Date;
  updatedAt: Date;
}

const pharmacySchema = new mongoose.Schema<IPharmacy>(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phonenumber: { type: String, required: true },
    referralCode: {
      type: String,
      sparse: true,
    },
    isVerified: { type: Boolean, default: false },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    pcnNumber: { type: String, required: true, unique: true },
    licenseDocument: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|pdf)$/.test(v);
        },
        message: (props: any) =>
          `${props.value} must be a valid HTTP/HTTPS URL ending with .jpg, .jpeg, .png, or .pdf`,
      },
    },
    logo: {
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
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    verificationCode: { type: String },
    verificationCodeExpires: { type: Number },
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Number },
  },
  {
    timestamps: true,
  }
);

pharmacySchema.index({ isVerified: 1 });
pharmacySchema.index({ location: 1 });

const Pharmacy = mongoose.model<IPharmacy>("Pharmacy", pharmacySchema);

export default Pharmacy;
