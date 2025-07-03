import express from "express";
import * as medicationController from "../controllers/medication.controller";
import { authorization } from "../middlewares/authorization.middlware";

const router = express.Router();

router.use(authorization);

router.post("/", medicationController.createMedication);
router.get("/", medicationController.getUserMedications);
router.get("/:medicationId", medicationController.getMedicationById);
router.put("/:medicationId", medicationController.updateMedication);
router.delete("/:medicationId", medicationController.deleteMedication);
router.patch(
  "/:medicationId/toggle",
  medicationController.toggleMedicationStatus
);

export default router;
