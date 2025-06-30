import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import Notification from "../models/Notification.model";
import createResponse from "../utils/createResponse.util";

export const createNotification = async (
  userId: string,
  title: string,
  message: string
): Promise<void> => {
  await Notification.create({
    userId,
    title,
    message,
    read: false,
  });
};

export const createOrderNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId || req.body.userId || req.params.userId;
    const orderData = req.body.orderData || req.body;

    if (!userId || !orderData) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing userId or orderData", null));
    }

    const notifications = [
      {
        userId,
        title: "Order Confirmed",
        message: `Your order #${orderData.orderCode} has been confirmed and is being prepared.`,
        read: false,
      },
    ];

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(StatusCodes.CREATED).json(
      createResponse("Order notification created successfully", {
        notifications: createdNotifications,
        count: createdNotifications.length,
      })
    );
  }
);

export const createPaymentNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId || req.body.userId || req.params.userId;
    const paymentData = req.body.paymentData || req.body;

    if (!userId || !paymentData) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing userId or paymentData", null));
    }

    const notification = {
      userId,
      title: "Payment Processed",
      message: `Your payment of $${paymentData.amount} has been successfully processed.`,
      read: false,
    };

    const createdNotification = await Notification.create(notification);

    res
      .status(StatusCodes.CREATED)
      .json(
        createResponse(
          "Payment notification created successfully",
          createdNotification
        )
      );
  }
);

export const createDeliveryNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId || req.body.userId || req.params.userId;
    const orderData = req.body.orderData || req.body;

    if (!userId || !orderData) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing userId or orderData", null));
    }

    const notification = {
      userId,
      title: "Order Delivered",
      message: `Your order #${orderData.orderCode} has been delivered successfully.`,
      read: false,
    };

    const createdNotification = await Notification.create(notification);

    res
      .status(StatusCodes.CREATED)
      .json(
        createResponse(
          "Delivery notification created successfully",
          createdNotification
        )
      );
  }
);

// Additional notification functions with createResponse format

export const createWelcomeNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId || req.body.userId || req.params.userId;
    const userData = req.body.userData || req.body;

    if (!userId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing userId", null));
    }

    const notification = {
      userId,
      title: "Welcome to Our Pharmacy!",
      message: `Welcome ${
        userData?.fullname || "valued customer"
      }! Your account has been successfully created. Start exploring our wide range of pharmaceutical products.`,
      read: false,
    };

    const createdNotification = await Notification.create(notification);

    res
      .status(StatusCodes.CREATED)
      .json(
        createResponse(
          "Welcome notification created successfully",
          createdNotification
        )
      );
  }
);

export const createVerificationNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId || req.body.userId || req.params.userId;

    if (!userId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing userId", null));
    }

    const notification = {
      userId,
      title: "Account Verified Successfully",
      message:
        "Congratulations! Your account has been verified. You now have full access to all our services and can start placing orders.",
      read: false,
    };

    const createdNotification = await Notification.create(notification);

    res
      .status(StatusCodes.CREATED)
      .json(
        createResponse(
          "Verification notification created successfully",
          createdNotification
        )
      );
  }
);

export const createMessageNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId || req.body.userId || req.params.userId;
    const messageData = req.body.messageData || req.body;

    if (!userId || !messageData) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing userId or messageData", null));
    }

    const notification = {
      userId,
      title: "New Message Received",
      message: `You have received a new message from ${
        messageData.senderName || "a pharmacy"
      }. Check your messages to view the full conversation.`,
      read: false,
    };

    const createdNotification = await Notification.create(notification);

    res
      .status(StatusCodes.CREATED)
      .json(
        createResponse(
          "Message notification created successfully",
          createdNotification
        )
      );
  }
);

export const createPromotionalNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const { userIds, title, message, promoData } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing or invalid userIds array", null));
    }

    if (!title || !message) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing title or message", null));
    }

    const notifications = userIds.map((userId: string) => ({
      userId,
      title: title || "Special Promotion",
      message: message || "Check out our latest offers and discounts!",
      read: false,
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(StatusCodes.CREATED).json(
      createResponse("Promotional notifications created successfully", {
        notifications: createdNotifications,
        count: createdNotifications.length,
        targetUsers: userIds.length,
      })
    );
  }
);

export const createLowStockNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId =
      req.user?.userId || req.body.pharmacyId || req.params.pharmacyId;
    const productData = req.body.productData || req.body;

    if (!pharmacyId || !productData) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing pharmacyId or productData", null));
    }

    const notification = {
      userId: pharmacyId,
      title: "Low Stock Alert",
      message: `${
        productData.productName || "A product"
      } is running low in stock (${
        productData.currentStock || 0
      } remaining). Please reorder soon to avoid stockouts.`,
      read: false,
    };

    const createdNotification = await Notification.create(notification);

    res
      .status(StatusCodes.CREATED)
      .json(
        createResponse(
          "Low stock notification created successfully",
          createdNotification
        )
      );
  }
);

export const createPasswordResetNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId || req.body.userId || req.params.userId;

    if (!userId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing userId", null));
    }

    const notification = {
      userId,
      title: "Password Reset Successful",
      message:
        "Your password has been successfully reset. If you did not make this change, please contact our support team immediately.",
      read: false,
    };

    const createdNotification = await Notification.create(notification);

    res
      .status(StatusCodes.CREATED)
      .json(
        createResponse(
          "Password reset notification created successfully",
          createdNotification
        )
      );
  }
);

export const createOrderCancelledNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId || req.body.userId || req.params.userId;
    const orderData = req.body.orderData || req.body;

    if (!userId || !orderData) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Missing userId or orderData", null));
    }

    const notification = {
      userId,
      title: "Order Cancelled",
      message: `Your order #${orderData.orderCode} has been cancelled. ${
        orderData.reason ? `Reason: ${orderData.reason}` : ""
      } If you have any questions, please contact customer support.`,
      read: false,
    };

    const createdNotification = await Notification.create(notification);

    res
      .status(StatusCodes.CREATED)
      .json(
        createResponse(
          "Order cancellation notification created successfully",
          createdNotification
        )
      );
  }
);

export const createInternalNotification = async (
  userId: string,
  title: string,
  message: string
): Promise<any> => {
  return await Notification.create({
    userId,
    title,
    message,
    read: false,
  });
};
