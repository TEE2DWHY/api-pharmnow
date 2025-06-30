import mongoose from "mongoose";

export interface IMessage extends mongoose.Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  senderType: "User" | "Pharmacy";
  receiverType: "User" | "Pharmacy";
  messageType: "text" | "image" | "voice";
  content?: string;
  mediaUrl?: string;
  mediaMetadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
    mimeType?: string;
  };
  status: "sent" | "delivered" | "read";
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new mongoose.Schema<IMessage>(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderType",
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "receiverType",
    },
    senderType: {
      type: String,
      required: true,
      enum: ["User", "Pharmacy"],
    },
    receiverType: {
      type: String,
      required: true,
      enum: ["User", "Pharmacy"],
    },
    messageType: {
      type: String,
      required: true,
      enum: ["text", "image", "voice"],
      default: "text",
    },
    content: {
      type: String,
      maxlength: 1000,
      required: function (this: IMessage) {
        return this.messageType === "text";
      },
    },
    mediaUrl: {
      type: String,
      required: function (this: IMessage) {
        return this.messageType === "image" || this.messageType === "voice";
      },
      validate: {
        validator: function (this: IMessage, v: string) {
          if (this.messageType === "image") {
            return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
          } else if (this.messageType === "voice") {
            return /^https?:\/\/.+\.(mp3|wav|m4a|ogg|aac)$/i.test(v);
          }
          return true;
        },
        message: function (this: IMessage, props: any) {
          if (this.messageType === "image") {
            return `${props.value} must be a valid image URL ending with .jpg, .jpeg, .png, .gif, or .webp`;
          } else if (this.messageType === "voice") {
            return `${props.value} must be a valid audio URL ending with .mp3, .wav, .m4a, .ogg, or .aac`;
          }
          return "Invalid media URL";
        },
      },
    },
    mediaMetadata: {
      fileName: { type: String },
      fileSize: {
        type: Number,
        validate: {
          validator: function (v: number) {
            return (
              v <=
              (this.messageType === "image"
                ? 50 * 1024 * 1024
                : 10 * 1024 * 1024)
            );
          },
          message: "File size exceeds maximum allowed limit",
        },
      },
      duration: {
        type: Number,
        validate: {
          validator: function (this: IMessage, v: number) {
            if (this.messageType === "voice") {
              return v <= 300;
            }
            return true;
          },
          message: "Voice note duration cannot exceed 5 minutes",
        },
      },
      mimeType: { type: String },
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model<IMessage>("Message", messageSchema);
