import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import asyncWrapper from "../middlewares/asyncWrapper";
import { User } from "../models/User.model";
import { generateToken } from "../helper/authHelper";

// REGISTER
export const register = asyncWrapper(async (req: Request, res: Response) => {
  const { fullname, email, password, phonenumber, deliveryAddress } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(StatusCodes.CONFLICT).json({
      success: false,
      message: "Email already registered",
    });
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(process.env.SALT_ROUNDS)
  );

  const newUser = new User({
    fullname,
    email,
    password: hashedPassword,
    phonenumber,
    deliveryAddress,
    favouritePharmacies: [],
    favouriteProducts: [],
    cardDetails: {
      cardNumber: "",
      cardHolderName: "",
      expiryDate: "",
      cvv: "",
    },
    orders: [],
    blockedPharmacies: [],
    blockedByPharmacies: [],
  });

  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  // Save verification code with user (you may want a separate field for that)
  // Let's store it as user.verificationCode, add to schema if needed
  (newUser as any).verificationCode = verificationCode;

  await newUser.save();

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "User registered successfully. Please verify your email.",
  });
});

// LOGIN
export const login = asyncWrapper(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  if (!user.isVerified) {
    return res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: "Please verify your email before logging in",
    });
  }

  const token = generateToken({
    email: user.email,
    userId: (user._id as string).toString(),
  });

  res.status(StatusCodes.OK).json({
    success: true,
    token,
  });
});

// FORGOT PASSWORD (generate reset token)
export const forgotPassword = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "If that email is registered, a reset link has been sent",
      });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    (user as any).resetPasswordCode = resetToken;
    (user as any).resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    console.log(`Send reset code to ${email}: ${resetToken}`);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Password reset code sent to your email.",
    });
  }
);

// RESET PASSWORD
export const resetPassword = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email, resetCode, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (
      !user ||
      (user as any).resetPasswordCode !== resetCode ||
      (user as any).resetPasswordExpires < Date.now()
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid or expired reset code",
      });
    }

    user.password = await bcrypt.hash(
      newPassword,
      Number(process.env.SALT_ROUNDS)
    );

    (user as any).resetPasswordCode = undefined;
    (user as any).resetPasswordExpires = undefined;

    await user.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Password reset successful",
    });
  }
);

// VERIFY PASSWORD
export const verifyCode = asyncWrapper(async (req: Request, res: Response) => {
  const { email, verificationCode } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Invalid email or code",
    });
  }

  if (user.verificationCode !== verificationCode) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Verification code is incorrect",
    });
  }

  await User.updateOne(
    { _id: user._id },
    { $unset: { verificationCode: "" }, $set: { isVerified: true } }
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Email verified successfully",
  });
});
