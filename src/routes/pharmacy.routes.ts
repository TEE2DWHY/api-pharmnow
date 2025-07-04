import { Router } from "express";
import * as pharmacyController from "../controllers/pharmacy.controller";
import {
  authorization,
  authorizeRoles,
} from "../middlewares/authorization.middlware";

const router = Router();

// Public routes
router.get("/search", pharmacyController.searchPharmacies);
router.get("/", pharmacyController.getAllPharmacies);

router.use(authorization);
router.get("/get-pharmacy", pharmacyController.getPharmacy);
router.get("/products", pharmacyController.getPharmacyProducts);
router.get(
  "/profile/me",
  authorizeRoles("Pharmacy"),
  pharmacyController.getPharmacyProfile
);
router.put(
  "/profile/update",
  authorizeRoles("Pharmacy"),

  pharmacyController.updatePharmacyProfile
);
router.get(
  "/dashboard/stats",
  authorizeRoles("Pharmacy"),
  pharmacyController.getPharmacyDashboard
);
router.delete(
  "/profile/delete",
  authorizeRoles("Pharmacy"),

  pharmacyController.deletePharmacyAccount
);

router.post(
  "/products",
  authorizeRoles("Pharmacy"),

  pharmacyController.addProduct
);
router.delete(
  "/products/:productId",
  authorizeRoles("Pharmacy"),
  pharmacyController.removeProduct
);

router.get(
  "/blocked/users",
  authorizeRoles("Pharmacy"),
  pharmacyController.getBlockedUsers
);
router.post(
  "/block/user",
  authorizeRoles("Pharmacy"),
  pharmacyController.blockUser
);

router.delete(
  "/block/user/:userId",
  authorizeRoles("Pharmacy"),
  pharmacyController.unblockUser
);

export default router;
