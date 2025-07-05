import { Router } from "express";
import {
  registerPharmacy,
  loginPharmacy,
  verifyPharmacyCode,
  resendPharmacyVerificationCode,
  checkPharmacyVerificationStatus,
  forgotPharmacyPassword,
  resetPharmacyPassword,
  changePharmacyPassword,
  getPharmacyAuthProfile,
  refreshPharmacyToken,
} from "../controllers/pharmacyAuth.controller";
import { authorization } from "../middlewares/authorization.middlware";
import {
  uploadPharmacyFiles,
  handleUploadError,
} from "../config/multer/upload.config";

const router = Router();

router.post(
  "/register",
  uploadPharmacyFiles,
  handleUploadError,
  registerPharmacy
);

router.post("/login", loginPharmacy);

router.post("/verify-email", verifyPharmacyCode);

router.post("/resend-verification", resendPharmacyVerificationCode);

router.post("/check-verification-status", checkPharmacyVerificationStatus);

router.post("/forgot-password", forgotPharmacyPassword);

router.post("/reset-password", resetPharmacyPassword);

// Protected routes (authentication required)
router.use(authorization);

router.put("/change-password", changePharmacyPassword);

router.get("/profile", getPharmacyAuthProfile);

router.post("/refresh-token", refreshPharmacyToken);

export default router;
