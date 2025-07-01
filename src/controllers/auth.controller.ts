import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import User from "../models/User.model";
import { generateToken } from "../helper/authHelper";
import createResponse from "../utils/createResponse.util";
import { createInternalNotification } from "../utils/createNotification.util";
import { sendEmail } from "../utils/email.util";
import verifyEmailTemplate from "../services/email/template/verifyEmailTemplate";
import resetPasswordTemplate from "../services/email/template/resetPasswordTemplate";

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

  const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const verificationCodeExpires = Date.now() + 10 * 60 * 1000;

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
    verificationCode: verificationCode,
    verificationCodeExpires: verificationCodeExpires,
  });

  await newUser.save();

  try {
    await sendEmail({
      email: email,
      subject: "Welcome to PharmNow - Verify Your Account",
      message: verifyEmailTemplate({
        verificationCode: verificationCode,
        fullname: newUser.fullname,
        year: new Date().getFullYear(),
      }),
    });

    res.status(StatusCodes.CREATED).json(
      createResponse(
        "User registered successfully. Please verify your email.",
        {
          email: newUser.email,
          fullname: newUser.fullname,
          isVerified: newUser.isVerified,
          message:
            "A 4-digit verification code has been sent to your email address.",
        }
      )
    );
  } catch (emailError) {
    console.error("Email sending failed:", emailError);
    res.status(StatusCodes.CREATED).json(
      createResponse(
        "User registered successfully, but email verification could not be sent. Please try again.",
        {
          email: newUser.email,
          fullname: newUser.fullname,
          isVerified: newUser.isVerified,
          emailSent: false,
        }
      )
    );
  }
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
    (user as any).resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    await sendEmail({
      email: email,
      subject: "Reset Your PharmNow Password",
      message: resetPasswordTemplate({
        resetToken: resetToken,
        fullname: user.fullname,
        year: new Date().getFullYear(),
        // resetUrl: "",
      }),
    });

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

  if (user.isVerified) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createResponse("Email is already verified", null));
  }

  if (!(user as any).verificationCode) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        createResponse(
          "No verification code found. Please request a new one.",
          null
        )
      );
  }

  if (
    (user as any).verificationCodeExpires &&
    (user as any).verificationCodeExpires < Date.now()
  ) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        createResponse(
          "Verification code has expired. Please request a new one.",
          null
        )
      );
  }

  if ((user as any).verificationCode !== verificationCode) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createResponse("Verification code is incorrect", null));
  }

  await User.updateOne(
    { _id: user._id },
    {
      $unset: {
        verificationCode: 1,
        verificationCodeExpires: 1,
      },
      $set: { isVerified: true },
    }
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

    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000;

    (user as any).verificationCode = verificationCode;
    (user as any).verificationCodeExpires = verificationCodeExpires;
    await user.save();

    try {
      await sendEmail({
        email: email,
        subject: "PharmNow - New Verification Code",
        message: verifyEmailTemplate({
          verificationCode: verificationCode,
          fullname: user.fullname,
          year: new Date().getFullYear(),
        }),
      });

      console.log(`New verification code for ${email}: ${verificationCode}`);

      res.status(StatusCodes.OK).json(
        createResponse("New verification code sent to your email", {
          message:
            "A new 4-digit verification code has been sent to your email address.",
          expiresIn: "10 minutes",
        })
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          createResponse(
            "Failed to send verification email. Please try again later.",
            null
          )
        );
    }
  }
);

// CHECK VERIFICATION STATUS
export const checkVerificationStatus = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("User not found", null));
    }

    const hasActiveCode =
      (user as any).verificationCode &&
      (user as any).verificationCodeExpires &&
      (user as any).verificationCodeExpires > Date.now();

    res.status(StatusCodes.OK).json(
      createResponse("Verification status retrieved", {
        isVerified: user.isVerified,
        hasActiveVerificationCode: hasActiveCode,
        email: user.email,
        fullname: user.fullname,
      })
    );
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
