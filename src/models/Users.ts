import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
