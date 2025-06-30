import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import {
  authorization,
  authorizeRoles,
} from "../middlewares/authorization.middlware";

const router = Router();

router.use(authorization);

router.get("/statistics", orderController.getOrderStatistics);
router.post("/", authorizeRoles("User"), orderController.createOrder);
router.get("/my-orders", authorizeRoles("User"), orderController.getUserOrders);
router.get(
  "/pharmacy-orders",
  authorizeRoles("Pharmacy"),
  orderController.getPharmacyOrders
);
router.put(
  "/:id/status",
  authorizeRoles("Pharmacy"),
  orderController.updateOrderStatus
);
router.get("/:id", orderController.getOrderById);
router.put("/:id/cancel", orderController.cancelOrder);
router.post(
  "/:id/review",
  authorizeRoles("User"),
  orderController.addOrderReview
);
router.get("/", orderController.getAllOrders);
router.put("/:id/payment-status", orderController.updatePaymentStatus);

export default router;
