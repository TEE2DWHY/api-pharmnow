import multer from "multer";
import path from "path";
import { Request } from "express";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/temp"); // Temporary storage before Cloudinary
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.fieldname === "logo") {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Logo must be an image file (jpg, jpeg, png)"));
    }
  } else if (file.fieldname === "licenseDocument") {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("License document must be an image or PDF file"));
    }
  } else if (file.fieldname === "image") {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Product image must be an image file (jpg, jpeg, png)"));
    }
  } else {
    cb(new Error("Unexpected field"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// For pharmacy registration (multiple files)
export const uploadPharmacyFiles = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "licenseDocument", maxCount: 1 },
]);

// For product creation (single image)
export const uploadProductImage = upload.single("image");

// Generic single file upload
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

export const handleUploadError = (
  error: any,
  req: Request,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File too large. Maximum size is 10MB.",
        error: error.message,
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Unexpected file field.",
        error: error.message,
      });
    }
  }

  if (
    error.message.includes("must be an image") ||
    error.message.includes("must be an image or PDF") ||
    error.message.includes("Product image must be an image")
  ) {
    return res.status(400).json({
      message: error.message,
      error: "Invalid file type",
    });
  }

  next(error);
};
