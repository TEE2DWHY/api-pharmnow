import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import Pharmacy from "../models/Pharmacy.model";
import { generateToken } from "../helper/authHelper";
import createResponse from "../utils/createResponse.util";
import { createInternalNotification } from "../utils/createNotification.util";
import { sendEmail } from "../utils/email.util";
import verifyEmailTemplate from "../services/email/template/verifyEmailTemplate";
import resetPasswordTemplate from "../services/email/template/resetPasswordTemplate";
import cloudinary from "../config/cloudinary/cloudinary.config";

// PHARMACY REGISTRATION
export const registerPharmacy = asyncWrapper(
  async (req: Request, res: Response) => {
    let logoUrl = "";
    let licenseDocumentUrl = "";

    const {
      name,
      location,
      contactNumber,
      email,
      password,
      phonenumber,
      pcnNumber,
      referralCode,
    } = req.body;

    try {
      const existingPharmacy = await Pharmacy.findOne({
        $or: [{ email }, { pcnNumber }],
      });

      if (existingPharmacy) {
        const conflictField =
          existingPharmacy.email === email ? "Email" : "PCN Number";
        return res
          .status(StatusCodes.CONFLICT)
          .json(createResponse(`${conflictField} already registered`, null));
      }

      if (referralCode) {
        const existingReferral = await Pharmacy.findOne({ referralCode });
        if (existingReferral) {
          return res
            .status(StatusCodes.CONFLICT)
            .json(createResponse("Referral code already exists", null));
        }
      }

      if (
        req.files &&
        typeof req.files === "object" &&
        !Array.isArray(req.files)
      ) {
        if (req.files.logo && Array.isArray(req.files.logo)) {
          const logoFile = req.files.logo[0];
          const logoResult = await cloudinary.uploader.upload(logoFile.path, {
            folder: "pharmnow/pharmacy-logos",
            transformation: [
              { width: 300, height: 300, crop: "fill" },
              { quality: "auto" },
              { format: "auto" },
            ],
          });
          logoUrl = logoResult.secure_url;
        }

        if (
          req.files.licenseDocument &&
          Array.isArray(req.files.licenseDocument)
        ) {
          const licenseFile = req.files.licenseDocument[0];
          const licenseResult = await cloudinary.uploader.upload(
            licenseFile.path,
            {
              folder: "pharmnow/pharmacy-licenses",
              resource_type: "auto",
            }
          );
          licenseDocumentUrl = licenseResult.secure_url;
        }
      } else if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "pharmnow/pharmacy-uploads",
          transformation: [
            { width: 300, height: 300, crop: "fill" },
            { quality: "auto" },
            { format: "auto" },
          ],
        });
        logoUrl = result.secure_url;
      }

      if (!logoUrl) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(createResponse("Logo image is required", null));
      }

      if (!licenseDocumentUrl) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(createResponse("License document is required", null));
      }

      const hashedPassword = await bcrypt.hash(
        password,
        Number(process.env.SALT_ROUNDS) || 12
      );

      const verificationCode = Math.floor(
        1000 + Math.random() * 9000
      ).toString();
      const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      const newPharmacy = new Pharmacy({
        name,
        location,
        contactNumber,
        email,
        password: hashedPassword,
        phonenumber,
        pcnNumber,
        licenseDocument: licenseDocumentUrl,
        logo: logoUrl,
        referralCode,
        products: [],
        blockedUsers: [],
        blockedByUsers: [],
        verificationCode: verificationCode,
        verificationCodeExpires: verificationCodeExpires,
      });

      await newPharmacy.save();

      try {
        await sendEmail({
          email: email,
          subject: "Welcome to PharmNow - Verify Your Pharmacy",
          message: verifyEmailTemplate({
            verificationCode: verificationCode,
            fullname: newPharmacy.name,
            year: new Date().getFullYear(),
          }),
        });

        res.status(StatusCodes.CREATED).json(
          createResponse(
            "Pharmacy registered successfully. Please verify your email.",
            {
              email: newPharmacy.email,
              name: newPharmacy.name,
              isVerified: newPharmacy.isVerified,
              logo: newPharmacy.logo,
              licenseDocument: newPharmacy.licenseDocument,
              message:
                "A 4-digit verification code has been sent to your email address.",
            }
          )
        );
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        res.status(StatusCodes.CREATED).json(
          createResponse(
            "Pharmacy registered successfully, but email verification could not be sent. Please try again.",
            {
              email: newPharmacy.email,
              name: newPharmacy.name,
              isVerified: newPharmacy.isVerified,
              logo: newPharmacy.logo,
              emailSent: false,
            }
          )
        );
      }
    } catch (error) {
      console.error("Pharmacy registration error:", error);

      // Clean up uploaded files if pharmacy creation fails
      if (logoUrl) {
        try {
          const publicId = logoUrl.split("/").pop()?.split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(
              `pharmnow/pharmacy-logos/${publicId}`
            );
          }
        } catch (cleanupError) {
          console.error("Error cleaning up logo:", cleanupError);
        }
      }

      if (licenseDocumentUrl) {
        try {
          const publicId = licenseDocumentUrl.split("/").pop()?.split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(
              `pharmnow/pharmacy-licenses/${publicId}`
            );
          }
        } catch (cleanupError) {
          console.error("Error cleaning up license document:", cleanupError);
        }
      }

      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          createResponse("Failed to register pharmacy. Please try again.", null)
        );
    }
  }
);

// PHARMACY LOGIN
export const loginPharmacy = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Find pharmacy with password field
    const pharmacy = await Pharmacy.findOne({ email }).select("+password");
    if (!pharmacy) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Invalid email or password", null));
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, pharmacy.password);
    if (!isMatch) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Invalid email or password", null));
    }

    // Check if pharmacy is verified
    if (!pharmacy.isVerified) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(
          createResponse("Please verify your email before logging in", null)
        );
    }

    // Generate token
    const token = generateToken({
      email: pharmacy.email,
      userId: (pharmacy._id as string).toString(),
      userType: "Pharmacy",
    });

    res.status(StatusCodes.OK).json(
      createResponse("Login successful", {
        token,
        pharmacy: {
          id: pharmacy._id,
          email: pharmacy.email,
          name: pharmacy.name,
          isVerified: pharmacy.isVerified,
          location: pharmacy.location,
          contactNumber: pharmacy.contactNumber,
          phonenumber: pharmacy.phonenumber,
          pcnNumber: pharmacy.pcnNumber,
          logo: pharmacy.logo,
        },
      })
    );
  }
);

// VERIFY PHARMACY EMAIL
export const verifyPharmacyCode = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email, verificationCode } = req.body;

    const pharmacy = await Pharmacy.findOne({ email });
    if (!pharmacy) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Invalid email or verification code", null));
    }

    if (pharmacy.isVerified) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Email is already verified", null));
    }

    // Check if verification code exists
    if (!(pharmacy as any).verificationCode) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse(
            "No verification code found. Please request a new one.",
            null
          )
        );
    }

    // Check if verification code has expired
    if (
      (pharmacy as any).verificationCodeExpires &&
      (pharmacy as any).verificationCodeExpires < Date.now()
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

    // Check if verification code matches
    if ((pharmacy as any).verificationCode !== verificationCode) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Verification code is incorrect", null));
    }

    // Verify the pharmacy and clear verification data
    await Pharmacy.updateOne(
      { _id: pharmacy._id },
      {
        $unset: {
          verificationCode: 1,
          verificationCodeExpires: 1,
        },
        $set: { isVerified: true },
      }
    );

    await createInternalNotification(
      (pharmacy._id as string).toString(),
      "Welcome to PharmNow!",
      "Your pharmacy email has been verified successfully. Welcome to our platform! You can now start listing your products and serving customers."
    );

    res.status(StatusCodes.OK).json(
      createResponse("Email verified successfully", {
        pharmacy: {
          id: pharmacy._id,
          email: pharmacy.email,
          name: pharmacy.name,
          isVerified: true,
        },
      })
    );
  }
);

// RESEND PHARMACY VERIFICATION CODE
export const resendPharmacyVerificationCode = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const pharmacy = await Pharmacy.findOne({ email });
    if (!pharmacy) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Pharmacy not found", null));
    }

    if (pharmacy.isVerified) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Email is already verified", null));
    }

    // Generate new verification code and expiration
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    (pharmacy as any).verificationCode = verificationCode;
    (pharmacy as any).verificationCodeExpires = verificationCodeExpires;
    await pharmacy.save();

    try {
      await sendEmail({
        email: email,
        subject: "PharmNow - New Verification Code",
        message: verifyEmailTemplate({
          verificationCode: verificationCode,
          fullname: pharmacy.name,
          year: new Date().getFullYear(),
        }),
      });

      console.log(
        `New verification code for pharmacy ${email}: ${verificationCode}`
      );

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

// PHARMACY FORGOT PASSWORD
export const forgotPharmacyPassword = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const pharmacy = await Pharmacy.findOne({ email });
    if (!pharmacy) {
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

    (pharmacy as any).resetPasswordCode = resetToken;
    (pharmacy as any).resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await pharmacy.save();

    await sendEmail({
      email: email,
      subject: "Reset Your PharmNow Password",
      message: resetPasswordTemplate({
        resetToken: resetToken,
        fullname: pharmacy.name,
        year: new Date().getFullYear(),
      }),
    });

    res
      .status(StatusCodes.OK)
      .json(createResponse("Password reset code sent to your email", null));
  }
);

// PHARMACY RESET PASSWORD
export const resetPharmacyPassword = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email, resetCode, newPassword } = req.body;

    const pharmacy = await Pharmacy.findOne({ email });
    if (
      !pharmacy ||
      (pharmacy as any).resetPasswordCode !== resetCode ||
      (pharmacy as any).resetPasswordExpires < Date.now()
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Invalid or expired reset code", null));
    }

    pharmacy.password = await bcrypt.hash(
      newPassword,
      Number(process.env.SALT_ROUNDS) || 12
    );

    (pharmacy as any).resetPasswordCode = undefined;
    (pharmacy as any).resetPasswordExpires = undefined;

    await pharmacy.save();

    await createInternalNotification(
      (pharmacy._id as string).toString(),
      "Password Reset Successful",
      "Your pharmacy password has been successfully reset. If you did not make this change, please contact support immediately."
    );

    res
      .status(StatusCodes.OK)
      .json(createResponse("Password reset successful", null));
  }
);

// PHARMACY CHANGE PASSWORD (for authenticated pharmacies)
export const changePharmacyPassword = asyncWrapper(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can access this endpoint", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const pharmacy = await Pharmacy.findById(pharmacyId).select("+password");
    if (!pharmacy) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Pharmacy not found", null));
    }

    const isMatch = await bcrypt.compare(currentPassword, pharmacy.password);
    if (!isMatch) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Current password is incorrect", null));
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      Number(process.env.SALT_ROUNDS) || 12
    );

    pharmacy.password = hashedPassword;
    await pharmacy.save();

    await createInternalNotification(
      pharmacyId,
      "Password Changed",
      "Your pharmacy password has been successfully changed. If you did not make this change, please contact support immediately."
    );

    res
      .status(StatusCodes.OK)
      .json(createResponse("Password changed successfully", null));
  }
);

// GET PHARMACY PROFILE (Current logged-in pharmacy)
export const getPharmacyAuthProfile = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can access this endpoint", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const pharmacy = await Pharmacy.findById(pharmacyId)
      .populate("products", "name price category inStock quantity")
      .select(
        "-password -verificationCode -verificationCodeExpires -resetPasswordCode -resetPasswordExpires -blockedUsers -blockedByUsers"
      );

    if (!pharmacy) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Pharmacy not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Pharmacy profile retrieved successfully", pharmacy)
      );
  }
);

// CHECK PHARMACY VERIFICATION STATUS
export const checkPharmacyVerificationStatus = asyncWrapper(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const pharmacy = await Pharmacy.findOne({ email });
    if (!pharmacy) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Pharmacy not found", null));
    }

    const hasActiveCode =
      (pharmacy as any).verificationCode &&
      (pharmacy as any).verificationCodeExpires &&
      (pharmacy as any).verificationCodeExpires > Date.now();

    res.status(StatusCodes.OK).json(
      createResponse("Verification status retrieved", {
        isVerified: pharmacy.isVerified,
        hasActiveVerificationCode: hasActiveCode,
        email: pharmacy.email,
        name: pharmacy.name,
      })
    );
  }
);

// REFRESH PHARMACY TOKEN
export const refreshPharmacyToken = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can refresh tokens", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const pharmacy = await Pharmacy.findById(pharmacyId);
    if (!pharmacy) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Pharmacy not found", null));
    }

    const newToken = generateToken({
      email: pharmacy.email,
      userId: (pharmacy._id as string).toString(),
      userType: "Pharmacy",
    });

    res.status(StatusCodes.OK).json(
      createResponse("Token refreshed successfully", {
        token: newToken,
        pharmacy: {
          id: pharmacy._id,
          email: pharmacy.email,
          name: pharmacy.name,
          isVerified: pharmacy.isVerified,
        },
      })
    );
  }
);
