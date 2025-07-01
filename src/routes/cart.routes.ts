import { Router } from "express";
import * as cartController from "../controllers/cart.controller";
import {
  authorization,
  authorizeRoles,
} from "../middlewares/authorization.middlware";

const router = Router();

// All routes require authentication
router.use(authorization);

// Cart management (User only)
router.get("/", authorizeRoles("User"), cartController.getCart);
router.get("/summary", authorizeRoles("User"), cartController.getCartSummary);
router.post("/add", authorizeRoles("User"), cartController.addToCart);
router.put("/update", authorizeRoles("User"), cartController.updateCartItem);
router.delete(
  "/remove/:productId",
  authorizeRoles("User"),
  cartController.removeFromCart
);
router.delete("/clear", authorizeRoles("User"), cartController.clearCart);

// Advanced cart operations
router.post(
  "/move-to-favorites/:productId",
  authorizeRoles("User"),
  cartController.moveToFavorites
);
router.post("/sync", authorizeRoles("User"), cartController.syncCart);

export default router;
