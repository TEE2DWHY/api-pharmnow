import mongoose from "mongoose";

export interface IMedication extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  medication: string;
  dosage: string;
  quantity: number;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  reminderTimes: string[];
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const medicationSchema = new mongoose.Schema<IMedication>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    medication: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    frequency: {
      type: String,
      required: true,
      enum: [
        "once_daily",
        "twice_daily",
        "three_times_daily",
        "four_times_daily",
        "every_4h",
        "every_6h",
        "every_8h",
        "every_12h",
        "as_needed",
        "before_meals",
        "after_meals",
        "bedtime",
      ],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    reminderTimes: [
      {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

medicationSchema.index({ userId: 1, isActive: 1 });
medicationSchema.index({ userId: 1, createdAt: -1 });

const Medication = mongoose.model<IMedication>("Medication", medicationSchema);

export default Medication;
