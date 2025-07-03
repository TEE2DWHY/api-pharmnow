import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import Medication from "../models/Medication.model";
import User from "../models/User.model";
import createResponse from "../utils/createResponse.util";
import { createInternalNotification } from "../utils/createNotification.util";
import mongoose from "mongoose";

const generateReminderTimes = (
  frequency: string,
  customTimes: string[] = []
): string[] => {
  if (customTimes.length > 0) return customTimes;

  const timeMap: Record<string, string[]> = {
    once_daily: ["08:00"],
    twice_daily: ["08:00", "20:00"],
    three_times_daily: ["08:00", "14:00", "20:00"],
    four_times_daily: ["08:00", "12:00", "16:00", "20:00"],
    every_4h: ["06:00", "10:00", "14:00", "18:00", "22:00"],
    every_6h: ["06:00", "12:00", "18:00"],
    every_8h: ["08:00", "16:00"],
    every_12h: ["08:00", "20:00"],
    before_meals: ["07:30", "12:30", "18:30"],
    after_meals: ["08:30", "13:30", "19:30"],
    bedtime: ["22:00"],
    as_needed: ["08:00"],
  };

  return timeMap[frequency] || ["08:00"];
};

// CREATE NEW MEDICATION
export const createMedication = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const {
      medication,
      dosage,
      quantity,
      frequency,
      reminderTimes,
      notes,
      endDate,
    } = req.body;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    // Validate required fields
    if (!medication || !dosage || !quantity || !frequency) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse(
            "Please provide all required fields: medication, dosage, quantity, frequency",
            null
          )
        );
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Quantity must be a positive number", null));
    }

    const times = generateReminderTimes(frequency, reminderTimes);

    const newMedication = await Medication.create({
      userId,
      medication: medication.trim(),
      dosage: dosage.trim(),
      quantity: quantityNum,
      frequency,
      reminderTimes: times,
      notes: notes?.trim(),
      endDate: endDate ? new Date(endDate) : undefined,
    });

    const populatedMedication = await Medication.findById(
      newMedication._id
    ).populate("userId", "fullname email");

    await createInternalNotification(
      userId,
      "Medication Added",
      `${medication} has been added to your medication list`
    );

    res
      .status(StatusCodes.CREATED)
      .json(
        createResponse("Medication added successfully", populatedMedication)
      );
  }
);

// GET USER MEDICATIONS
export const getUserMedications = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { page = 1, limit = 20, status = "all", search = "" } = req.query;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const query: any = { userId };

    // Filter by status
    if (status !== "all") {
      query.isActive = status === "active";
    }

    // Search functionality
    if (search) {
      query.$or = [
        { medication: { $regex: search, $options: "i" } },
        { dosage: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const medications = await Medication.find(query)
      .populate("userId", "fullname email")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Medication.countDocuments(query);

    res.status(StatusCodes.OK).json(
      createResponse("Medications retrieved successfully", {
        medications,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalMedications: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// GET SINGLE MEDICATION
export const getMedicationById = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { medicationId } = req.params;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    if (!mongoose.Types.ObjectId.isValid(medicationId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Invalid medication ID", null));
    }

    const medication = await Medication.findOne({
      _id: medicationId,
      userId,
    }).populate("userId", "fullname email");

    if (!medication) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Medication not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Medication retrieved successfully", medication));
  }
);

// UPDATE MEDICATION
export const updateMedication = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { medicationId } = req.params;
    const {
      medication,
      dosage,
      quantity,
      frequency,
      reminderTimes,
      notes,
      endDate,
      isActive,
    } = req.body;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    if (!mongoose.Types.ObjectId.isValid(medicationId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Invalid medication ID", null));
    }

    const existingMedication = await Medication.findOne({
      _id: medicationId,
      userId,
    });

    if (!existingMedication) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Medication not found", null));
    }

    // Generate new reminder times if frequency changed
    const times =
      frequency && frequency !== existingMedication.frequency
        ? generateReminderTimes(frequency, reminderTimes)
        : reminderTimes || existingMedication.reminderTimes;

    const updateData: any = {};

    if (medication) updateData.medication = medication.trim();
    if (dosage) updateData.dosage = dosage.trim();
    if (quantity) {
      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(createResponse("Quantity must be a positive number", null));
      }
      updateData.quantity = quantityNum;
    }
    if (frequency) updateData.frequency = frequency;
    if (times) updateData.reminderTimes = times;
    if (notes !== undefined) updateData.notes = notes?.trim();
    if (endDate !== undefined)
      updateData.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedMedication = await Medication.findByIdAndUpdate(
      medicationId,
      updateData,
      { new: true, runValidators: true }
    ).populate("userId", "fullname email");

    // Create notification
    await createInternalNotification(
      userId,
      "Medication Updated",
      `${updatedMedication?.medication} has been updated`
    );

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Medication updated successfully", updatedMedication)
      );
  }
);

// DELETE MEDICATION
export const deleteMedication = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { medicationId } = req.params;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    if (!mongoose.Types.ObjectId.isValid(medicationId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Invalid medication ID", null));
    }

    const medication = await Medication.findOne({
      _id: medicationId,
      userId,
    });

    if (!medication) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Medication not found", null));
    }

    // Delete medication
    await Medication.findByIdAndDelete(medicationId);

    // Create notification
    await createInternalNotification(
      userId,
      "Medication Deleted",
      `${medication.medication} has been removed from your medication list`
    );

    res
      .status(StatusCodes.OK)
      .json(createResponse("Medication deleted successfully", null));
  }
);

// TOGGLE MEDICATION STATUS
export const toggleMedicationStatus = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { medicationId } = req.params;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    if (!mongoose.Types.ObjectId.isValid(medicationId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Invalid medication ID", null));
    }

    const medication = await Medication.findOne({
      _id: medicationId,
      userId,
    });

    if (!medication) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Medication not found", null));
    }

    medication.isActive = !medication.isActive;
    await medication.save();

    await createInternalNotification(
      userId,
      "Medication Status Updated",
      `${medication.medication} has been ${
        medication.isActive ? "activated" : "deactivated"
      }`
    );

    res
      .status(StatusCodes.OK)
      .json(
        createResponse(
          `Medication ${
            medication.isActive ? "activated" : "deactivated"
          } successfully`,
          medication
        )
      );
  }
);
