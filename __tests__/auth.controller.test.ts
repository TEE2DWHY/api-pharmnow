import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../src/server";
import User from "../src/models/User.model";
import { generateToken } from "../src/helper/authHelper";
import { sendEmail } from "../src/utils/email.util";
import { createInternalNotification } from "../src/utils/createNotification.util";

jest.mock("../src/utils/email.util");
jest.mock("../src/utils/createNotification.util");
jest.mock("../src/helper/authHelper");

const mockedSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockedCreateInternalNotification =
  createInternalNotification as jest.MockedFunction<
    typeof createInternalNotification
  >;
const mockedGenerateToken = generateToken as jest.MockedFunction<
  typeof generateToken
>;

describe("Auth Controller", () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    await User.deleteMany({});

    testUser = {
      _id: "mockUserId123",
      fullname: "John Doe",
      email: "test@example.com",
      password: await bcrypt.hash("password123", 12),
      phonenumber: "+1234567890",
      deliveryAddress: "Test Address",
      isVerified: true,
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
    };

    // Mock token generation
    authToken = "mock-jwt-token";
    mockedGenerateToken.mockReturnValue(authToken);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /register", () => {
    const validRegistrationData = {
      fullname: "Jane Smith",
      email: "jane@example.com",
      password: "password123",
      phonenumber: "+1234567891",
      deliveryAddress: "Jane Address",
    };

    it("should register a new user successfully", async () => {
      (mockedSendEmail as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "User registered successfully. Please verify your email."
      );
      expect(response.body.data.email).toBe(validRegistrationData.email);
      expect(response.body.data.isVerified).toBe(false);
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it("should return conflict if email already exists", async () => {
      await User.create({
        ...testUser,
        email: validRegistrationData.email,
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Email already registered");
    });

    it("should handle email sending failure gracefully", async () => {
      mockedSendEmail.mockRejectedValue(new Error("Email service failed"));

      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.data.emailSent).toBe(false);
      expect(response.body.message).toContain(
        "email verification could not be sent"
      );
    });

    it("should validate required fields", async () => {
      const invalidData = { email: "test@example.com" };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /login", () => {
    beforeEach(async () => {
      await User.create(testUser);
    });

    it("should login successfully with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "password123",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.data.token).toBe(authToken);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(generateToken).toHaveBeenCalledWith({
        email: testUser.email,
        userId: testUser._id.toString(),
        userType: "User",
      });
    });

    it("should reject invalid email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "wrong@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should reject invalid password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should reject unverified users", async () => {
      await User.findOneAndUpdate(
        { email: testUser.email },
        { isVerified: false }
      );

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "password123",
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Please verify your email before logging in"
      );
    });
  });

  describe("POST /forgot-password", () => {
    beforeEach(async () => {
      await User.create(testUser);
      (mockedSendEmail as jest.Mock).mockResolvedValue(true);
    });

    it("should send reset code for valid email", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Password reset code sent to your email"
      );
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Check that reset code was saved
      const user = await User.findOne({ email: testUser.email });
      expect(user?.resetPasswordCode).toBeDefined();
      expect(user?.resetPasswordExpires).toBeDefined();
    });

    it("should return success even for non-existent email (security)", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nonexistent@example.com" })
        .expect(200);

      expect(response.body.message).toBe(
        "If that email is registered, a reset code has been sent"
      );
    });
  });

  describe("POST /reset-password", () => {
    let resetCode: string;

    beforeEach(async () => {
      resetCode = "123456";
      await User.create({
        ...testUser,
        resetPasswordCode: resetCode,
        resetPasswordExpires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });
      mockedCreateInternalNotification.mockResolvedValue(true);
    });

    it("should reset password with valid code", async () => {
      const newPassword = "newpassword123";

      const response = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: testUser.email,
          resetCode,
          newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Password reset successful");
      expect(createInternalNotification).toHaveBeenCalledWith(
        testUser._id.toString(),
        "Password Reset Successful",
        expect.any(String)
      );

      // Verify password was changed
      const user = await User.findOne({ email: testUser.email }).select(
        "+password"
      );
      const passwordMatch = await bcrypt.compare(
        newPassword,
        user?.password || ""
      );
      expect(passwordMatch).toBe(true);

      // Verify reset code was cleared
      expect(user?.resetPasswordCode).toBeUndefined();
      expect(user?.resetPasswordExpires).toBeUndefined();
    });

    it("should reject invalid reset code", async () => {
      const response = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: testUser.email,
          resetCode: "invalid",
          newPassword: "newpassword123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid or expired reset code");
    });

    it("should reject expired reset code", async () => {
      await User.findOneAndUpdate(
        { email: testUser.email },
        { resetPasswordExpires: Date.now() - 1000 } // Expired
      );

      const response = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: testUser.email,
          resetCode,
          newPassword: "newpassword123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid or expired reset code");
    });
  });

  describe("POST /verify-code", () => {
    let verificationCode: string;

    beforeEach(async () => {
      verificationCode = "1234";
      await User.create({
        ...testUser,
        isVerified: false,
        verificationCode,
        verificationCodeExpires: Date.now() + 10 * 60 * 1000,
      });
      mockedCreateInternalNotification.mockResolvedValue(true);
    });

    it("should verify email with valid code", async () => {
      const response = await request(app)
        .post("/api/auth/verify-code")
        .send({
          email: testUser.email,
          verificationCode,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Email verified successfully");
      expect(response.body.data.user.isVerified).toBe(true);
      expect(createInternalNotification).toHaveBeenCalledTimes(1);

      // Verify user is marked as verified
      const user = await User.findOne({ email: testUser.email });
      expect(user?.isVerified).toBe(true);
      expect(user?.verificationCode).toBeUndefined();
    });

    it("should reject invalid verification code", async () => {
      const response = await request(app)
        .post("/api/auth/verify-code")
        .send({
          email: testUser.email,
          verificationCode: "wrong",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Verification code is incorrect");
    });

    it("should reject already verified users", async () => {
      await User.findOneAndUpdate(
        { email: testUser.email },
        { isVerified: true }
      );

      const response = await request(app)
        .post("/api/auth/verify-code")
        .send({
          email: testUser.email,
          verificationCode,
        })
        .expect(400);

      expect(response.body.message).toBe("Email is already verified");
    });
  });

  describe("POST /change-password", () => {
    beforeEach(async () => {
      await User.create(testUser);
      mockedCreateInternalNotification.mockResolvedValue(true);
    });

    it("should change password successfully", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "password123",
          newPassword: "newpassword123",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Password changed successfully");
      expect(createInternalNotification).toHaveBeenCalledWith(
        testUser._id,
        "Password Changed",
        expect.any(String)
      );
    });

    it("should reject incorrect current password", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "wrongpassword",
          newPassword: "newpassword123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Current password is incorrect");
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .send({
          currentPassword: "password123",
          newPassword: "newpassword123",
        })
        .expect(401);

      expect(response.body.message).toBe("Authentication required");
    });
  });

  describe("POST /resend-verification-code", () => {
    beforeEach(async () => {
      await User.create({
        ...testUser,
        isVerified: false,
      });
      (mockedSendEmail as jest.Mock).mockResolvedValue(true);
    });

    it("should resend verification code", async () => {
      const response = await request(app)
        .post("/api/auth/resend-verification-code")
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "New verification code sent to your email"
      );
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Check that new code was generated
      const user = await User.findOne({ email: testUser.email });
      expect(user?.verificationCode).toBeDefined();
      expect(user?.verificationCodeExpires).toBeDefined();
    });

    it("should reject already verified users", async () => {
      await User.findOneAndUpdate(
        { email: testUser.email },
        { isVerified: true }
      );

      const response = await request(app)
        .post("/api/auth/resend-verification-code")
        .send({ email: testUser.email })
        .expect(400);

      expect(response.body.message).toBe("Email is already verified");
    });
  });
});
