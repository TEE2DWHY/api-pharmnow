import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import authorization from "../middlewares/authorization.middlware";

const router = Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyCode);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/resend-verification", authController.resendVerificationCode);

// Authenticated routes
router.use(authorization);
router.put("/change-password", authController.changePassword);

export default router;
