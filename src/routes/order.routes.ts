// src/routes/order.routes.ts
import { Router } from "express";
import {
  getUserOrders,
  getPharmacyOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  addOrderReview,
  getOrderStatistics,
  declineOrder,
  updateOrderStatus,
} from "../controllers/order.controller";
import authorization from "../middlewares/authorization.middlware";
const router = Router();

router.use(authorization);

// User Routes
router.get("/user", getUserOrders);
router.post("/", createOrder);
router.post("/:orderId/review", addOrderReview);
router.post("/:orderId/cancel", cancelOrder);
router.get("/statistics", getOrderStatistics);
router.get("/:orderId", getOrderById);

// Pharmacy Routes
router.get("/pharmacy", getPharmacyOrders);
router.post("/:orderId/decline", declineOrder);
router.patch("/:orderId/status", updateOrderStatus);

export default router;
