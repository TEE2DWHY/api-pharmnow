import { Router } from "express";
import * as productController from "../controllers/product.controller";
import {
  authorization,
  authorizeRoles,
} from "../middlewares/authorization.middlware";
import {
  uploadProductImage,
  handleUploadError,
} from "../config/multer/upload.config";

const router = Router();

// Public routes
router.get("/", productController.getAllProducts);
router.get("/search", productController.searchProducts);
router.get("/categories", productController.getProductCategories);
router.get("/featured", productController.getFeaturedProducts);
router.get("/category/:category", productController.getProductsByCategory);
router.get("/:id", productController.getProductById);

router.use(authorization);

router.post(
  "/",
  authorizeRoles("Pharmacy"),
  uploadProductImage,
  handleUploadError,
  productController.createProduct
);
router.put("/:id", authorizeRoles("Pharmacy"), productController.updateProduct);
router.delete(
  "/:id",
  authorizeRoles("Pharmacy"),
  productController.deleteProduct
);
router.put(
  "/bulk/update",
  authorizeRoles("Pharmacy"),
  productController.bulkUpdateProducts
);
router.get(
  "/pharmacy/low-stock",
  authorizeRoles("Pharmacy"),
  productController.getLowStockProducts
);

export default router;
