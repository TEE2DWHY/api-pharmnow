import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import User from "../models/User.model";
import { generateToken } from "../helper/authHelper";
import createResponse from "../utils/createResponse.util";
import { createInternalNotification } from "../utils/createNotification.util";

// REGISTER
export const register = asyncWrapper(async (req: Request, res: Response) => {
  const { fullname, email, password, phonenumber, deliveryAddress } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res
      .status(StatusCodes.CONFLICT)
      .json(createResponse("Email already registered", null));
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(process.env.SALT_ROUNDS) || 12
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

  (newUser as any).verificationCode = verificationCode;

  await newUser.save();

  // TODO: Send verification email with verificationCode
  console.log(`Verification code for ${email}: ${verificationCode}`);

  res.status(StatusCodes.CREATED).json(
    createResponse("User registered successfully. Please verify your email.", {
      email: newUser.email,
      fullname: newUser.fullname,
      isVerified: newUser.isVerified,
    })
  );
});

// LOGIN
export const login = asyncWrapper(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Invalid email or password", null));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Invalid email or password", null));
  }

  if (!user.isVerified) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(createResponse("Please verify your email before logging in", null));
  }

  const token = generateToken({
    email: user.email,
    userId: (user._id as string).toString(),
    userType: "User",
  });

  res.status(StatusCodes.OK).json(
    createResponse("Login successful", {
      token,
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        isVerified: user.isVerified,
        phonenumber: user.phonenumber,
      },
    })
  );
});

// FORGOT PASSWORD (generate reset token)
export const forgotPassword = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(StatusCodes.OK)
        .json(
          createResponse(
            "If that email is registered, a reset code has been sent",
            null
          )
        );
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    (user as any).resetPasswordCode = resetToken;
    (user as any).resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    console.log(`Password reset code for ${email}: ${resetToken}`);

    res
      .status(StatusCodes.OK)
      .json(createResponse("Password reset code sent to your email", null));
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
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Invalid or expired reset code", null));
    }

    user.password = await bcrypt.hash(
      newPassword,
      Number(process.env.SALT_ROUNDS) || 12
    );

    (user as any).resetPasswordCode = undefined;
    (user as any).resetPasswordExpires = undefined;

    await user.save();

    await createInternalNotification(
      (user._id as string).toString(),
      "Password Reset Successful",
      "Your password has been successfully reset. If you did not make this change, please contact support immediately."
    );

    res
      .status(StatusCodes.OK)
      .json(createResponse("Password reset successful", null));
  }
);

// VERIFY EMAIL
export const verifyCode = asyncWrapper(async (req: Request, res: Response) => {
  const { email, verificationCode } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createResponse("Invalid email or verification code", null));
  }

  if ((user as any).verificationCode !== verificationCode) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createResponse("Verification code is incorrect", null));
  }

  if (user.isVerified) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createResponse("Email is already verified", null));
  }

  await User.updateOne(
    { _id: user._id },
    { $unset: { verificationCode: 1 }, $set: { isVerified: true } }
  );

  await createInternalNotification(
    (user._id as string).toString(),
    "Welcome to PharmNow!",
    "Your email has been verified successfully. Welcome to our pharmacy platform! You can now start exploring and ordering from verified pharmacies."
  );

  res.status(StatusCodes.OK).json(
    createResponse("Email verified successfully", {
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        isVerified: true,
      },
    })
  );
});

// RESEND VERIFICATION CODE
export const resendVerificationCode = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("User not found", null));
    }

    if (user.isVerified) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Email is already verified", null));
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    (user as any).verificationCode = verificationCode;
    await user.save();

    console.log(`New verification code for ${email}: ${verificationCode}`);

    res
      .status(StatusCodes.OK)
      .json(createResponse("New verification code sent to your email", null));
  }
);

// CHANGE PASSWORD (for authenticated users)
export const changePassword = asyncWrapper(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Current password is incorrect", null));
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      Number(process.env.SALT_ROUNDS) || 12
    );

    user.password = hashedPassword;
    await user.save();

    await createInternalNotification(
      userId,
      "Password Changed",
      "Your password has been successfully changed. If you did not make this change, please contact support immediately."
    );

    res
      .status(StatusCodes.OK)
      .json(createResponse("Password changed successfully", null));
  }
);

// GET CURRENT USER PROFILE
export const getProfile = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  const user = await User.findById(userId)
    .populate("favouritePharmacies", "name location logo")
    .populate("favouriteProducts", "name price images")
    .select(
      "-password -verificationCode -resetPasswordCode -resetPasswordExpires -cardDetails.cvv"
    );

  if (!user) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse("User not found", null));
  }

  res
    .status(StatusCodes.OK)
    .json(createResponse("Profile retrieved successfully", user));
});

// REFRESH TOKEN (optional - for token refresh functionality)
export const refreshToken = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    const newToken = generateToken({
      email: user.email,
      userId: (user._id as string).toString(),
      userType: "User",
    });

    res.status(StatusCodes.OK).json(
      createResponse("Token refreshed successfully", {
        token: newToken,
        user: {
          id: user._id,
          email: user.email,
          fullname: user.fullname,
          isVerified: user.isVerified,
        },
      })
    );
  }
);
