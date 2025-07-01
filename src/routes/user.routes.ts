import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authorization } from "../middlewares/authorization.middlware";

const router = Router();

// Public routes (Admin access - you might want to add admin middleware)
router.get("/", userController.getAllUsers);

router.use(authorization);

router.get("/get-user", userController.getUserById);

// Profile management
router.put("/profile/update", userController.updateProfile);
router.delete("/profile/delete", userController.deleteAccount);

// Card details
router.put("/profile/card-details", userController.updateCardDetails);

// Favourite pharmacies
router.get("/favourites/pharmacies", userController.getFavouritePharmacies);
router.post("/favourites/pharmacies", userController.addFavouritePharmacy);
router.delete(
  "/favourites/pharmacies/:pharmacyId",
  userController.removeFavouritePharmacy
);

// Favourite products
router.get("/favourites/products", userController.getFavouriteProducts);
router.post("/favourites/products", userController.addFavouriteProduct);
router.delete(
  "/favourites/products/:productId",
  userController.removeFavouriteProduct
);

// Orders
router.get("/orders", userController.getUserOrders);

// Blocking functionality
router.get("/blocked/pharmacies", userController.getBlockedPharmacies);
router.post("/block/pharmacy", userController.blockPharmacy);
router.delete("/block/pharmacy/:pharmacyId", userController.unblockPharmacy);

// // Dashboard
// router.get("/dashboard/stats", userController.getDashboardStats);

export default router;
