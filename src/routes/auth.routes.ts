import { Router } from "express";
import * as authController from "../controllers/auth.controller";

const router = Router();

// Public authentication routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyCode);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
