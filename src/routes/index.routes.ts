import { Router } from "express";
import userRoutes from "./user.routes";
import productRoutes from "./product.routes";
import pharmacyRoutes from "./pharmacy.routes";
import orderRoutes from "./order.routes";
import authRoutes from "./auth.routes";
import messageRoutes from "./message.routes";
import cartRoutes from "./cart.routes";
import notificationRoutes from "./notification.routes";
import medicationRoutes from "./medication.routes";
import pharmacyAuthRoutes from "./pharmacyAuth.routes";

const router = Router();

router.use("/v1/auth", authRoutes);
router.use("/v1/users", userRoutes);
router.use("/v1/products", productRoutes);
router.use("/v1/pharmacies", pharmacyRoutes);
router.use("/v1/orders", orderRoutes);
router.use("/v1/messages", messageRoutes);
router.use("/v1/cart", cartRoutes);
router.use("/v1/notifications", notificationRoutes);
router.use("/v1/medications", medicationRoutes);
router.use("/v1/pharmacyAuth", pharmacyAuthRoutes);

export default router;
