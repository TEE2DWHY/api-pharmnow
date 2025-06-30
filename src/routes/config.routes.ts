import { Router } from "express";
import userRoutes from "./user.routes";
import productRoutes from "./product.routes";
import pharmacyRoutes from "./pharmacy.routes";
import orderRoutes from "./order.routes";
// import authRoutes from "./auth.routes";
// import messageRoutes from "./message.routes";

const router = Router();

// router.use("/v1/auth", authRoutes);
router.use("/v1/users", userRoutes);
router.use("/v1/products", productRoutes);
router.use("/v1/pharmacies", pharmacyRoutes);
router.use("/v1/orders", orderRoutes);
// router.use("/v1/messages", messageRoutes);

export default router;
