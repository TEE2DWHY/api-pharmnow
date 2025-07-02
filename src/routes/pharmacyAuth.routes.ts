import { Router } from "express";
import * as pharmacyAuth from "../controllers/pharmacyAuth.controller";
import { authorization } from "../middlewares/authorization.middlware";

const router = Router();

// Public routes (no authentication required)
router.post("/register", pharmacyAuth.registerPharmacy);

router.post("/login", pharmacyAuth.loginPharmacy);

router.post("/verify-email", pharmacyAuth.verifyPharmacyCode);

router.post(
  "/resend-verification",

  pharmacyAuth.resendPharmacyVerificationCode
);

router.post(
  "/check-verification-status",
  pharmacyAuth.checkPharmacyVerificationStatus
);

router.post("/forgot-password", pharmacyAuth.forgotPharmacyPassword);

router.post("/reset-password", pharmacyAuth.resetPharmacyPassword);

// Protected routes (authentication required)
router.use(authorization);

router.post("/change-password", pharmacyAuth.changePharmacyPassword);

router.get("/profile", pharmacyAuth.getPharmacyAuthProfile);

router.post("/refresh-token", pharmacyAuth.refreshPharmacyToken);

export default router;
