import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import User from "../models/User.model";
import Pharmacy from "../models/Pharmacy.model";
import createResponse from "../utils/createResponse.util";
import Message from "../models/Message.model";
import { createInternalNotification } from "../utils/createNotification.util";
import mongoose from "mongoose";

// SEND MESSAGE
export const sendMessage = asyncWrapper(async (req: Request, res: Response) => {
  const senderId = req.user?.userId;
  const senderType = req.user?.userType;
  const {
    receiver,
    receiverType,
    messageType = "text",
    content,
    mediaUrl,
    mediaMetadata,
  } = req.body;

  if (!senderId || !senderType) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  // Validate receiver exists
  let receiverExists = false;
  let receiverName = "";

  if (receiverType === "User") {
    const user = await User.findById(receiver);
    if (user) {
      receiverExists = true;
      receiverName = user.fullname;
    }
  } else if (receiverType === "Pharmacy") {
    const pharmacy = await Pharmacy.findById(receiver);
    if (pharmacy) {
      receiverExists = true;
      receiverName = pharmacy.name;
    }
  }

  if (!receiverExists) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse(`${receiverType} not found`, null));
  }

  const isBlocked = await checkBlockingStatus(
    senderId,
    receiver,
    senderType,
    receiverType
  );
  if (isBlocked) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(createResponse("Cannot send message. User is blocked", null));
  }

  // Create message
  const messageData: any = {
    sender: senderId,
    receiver,
    senderType,
    receiverType,
    messageType,
    status: "sent",
    isBlocked: false,
  };

  if (messageType === "text") {
    messageData.content = content;
  } else {
    messageData.mediaUrl = mediaUrl;
    if (mediaMetadata) {
      messageData.mediaMetadata = mediaMetadata;
    }
  }

  const message = await Message.create(messageData);

  // Populate sender and receiver info
  const populatedMessage = await Message.findById(message._id)
    .populate("sender", senderType === "User" ? "fullname email" : "name email")
    .populate(
      "receiver",
      receiverType === "User" ? "fullname email" : "name email"
    );

  // Create notification for receiver
  const senderName =
    senderType === "User"
      ? (await User.findById(senderId))?.fullname || "A user"
      : (await Pharmacy.findById(senderId))?.name || "A pharmacy";

  await createInternalNotification(
    receiver,
    "New Message",
    `You have received a new message from ${senderName}`
  );

  res
    .status(StatusCodes.CREATED)
    .json(createResponse("Message sent successfully", populatedMessage));
});

// GET CONVERSATION BETWEEN TWO ENTITIES
export const getConversation = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userType = req.user?.userType;
    const { otherEntityId, otherEntityType } = req.params;
    const { page = 1, limit = 50, messageType } = req.query;

    if (!userId || !userType) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    // Build query for conversation
    const query: any = {
      $or: [
        {
          sender: userId,
          receiver: otherEntityId,
          senderType: userType,
          receiverType: otherEntityType,
        },
        {
          sender: otherEntityId,
          receiver: userId,
          senderType: otherEntityType,
          receiverType: userType,
        },
      ],
      isBlocked: false,
    };

    if (messageType) {
      query.messageType = messageType;
    }

    const messages = await Message.find(query)
      .populate("sender", userType === "User" ? "fullname email" : "name email")
      .populate(
        "receiver",
        otherEntityType === "User" ? "fullname email" : "name email"
      )
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Message.countDocuments(query);

    // Mark messages as delivered if user is receiver
    await Message.updateMany(
      {
        sender: otherEntityId,
        receiver: userId,
        status: "sent",
      },
      { status: "delivered" }
    );

    res.status(StatusCodes.OK).json(
      createResponse("Conversation retrieved successfully", {
        messages: messages.reverse(), // Show oldest first
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalMessages: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// GET ALL CONVERSATIONS FOR USER
export const getConversations = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userType = req.user?.userType;
    const { page = 1, limit = 20 } = req.query;

    if (!userId || !userType) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    // Get latest message for each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
          isBlocked: false,
        },
      },
      {
        $addFields: {
          otherEntity: {
            $cond: {
              if: { $eq: ["$sender", userId] },
              then: "$receiver",
              else: "$sender",
            },
          },
          otherEntityType: {
            $cond: {
              if: { $eq: ["$sender", userId] },
              then: "$receiverType",
              else: "$senderType",
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            otherEntity: "$otherEntity",
            otherEntityType: "$otherEntityType",
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", userId] },
                    { $ne: ["$status", "read"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $skip: (Number(page) - 1) * Number(limit),
      },
      {
        $limit: Number(limit),
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);

    // Populate other entity details
    for (let conv of conversations) {
      const entityType = conv._id.otherEntityType;
      const entityId = conv._id.otherEntity;

      if (entityType === "User") {
        const user = await User.findById(entityId).select("fullname email");
        conv.otherEntityInfo = user;
      } else if (entityType === "Pharmacy") {
        const pharmacy = await Pharmacy.findById(entityId).select(
          "name email logo"
        );
        conv.otherEntityInfo = pharmacy;
      }
    }

    const total = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
          isBlocked: false,
        },
      },
      {
        $addFields: {
          otherEntity: {
            $cond: {
              if: { $eq: ["$sender", userId] },
              then: "$receiver",
              else: "$sender",
            },
          },
        },
      },
      {
        $group: {
          _id: "$otherEntity",
        },
      },
      {
        $count: "total",
      },
    ]);

    res.status(StatusCodes.OK).json(
      createResponse("Conversations retrieved successfully", {
        conversations,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil((total[0]?.total || 0) / Number(limit)),
          totalConversations: total[0]?.total || 0,
          hasNextPage:
            Number(page) < Math.ceil((total[0]?.total || 0) / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// MARK MESSAGE AS READ
export const markAsRead = asyncWrapper(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  const message = await Message.findOneAndUpdate(
    {
      _id: messageId,
      receiver: userId,
      status: { $ne: "read" },
    },
    { status: "read" },
    { new: true }
  );

  if (!message) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse("Message not found or already read", null));
  }

  res
    .status(StatusCodes.OK)
    .json(createResponse("Message marked as read", message));
});

// MARK ALL MESSAGES IN CONVERSATION AS READ
export const markConversationAsRead = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { otherEntityId } = req.params;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const result = await Message.updateMany(
      {
        sender: otherEntityId,
        receiver: userId,
        status: { $ne: "read" },
      },
      { status: "read" }
    );

    res.status(StatusCodes.OK).json(
      createResponse(`${result.modifiedCount} messages marked as read`, {
        modifiedCount: result.modifiedCount,
      })
    );
  }
);

// DELETE MESSAGE
export const deleteMessage = asyncWrapper(
  async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const message = await Message.findOneAndDelete({
      _id: messageId,
      sender: userId,
    });

    if (!message) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          createResponse(
            "Message not found or you can only delete your own messages",
            null
          )
        );
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Message deleted successfully", null));
  }
);

// GET MESSAGE STATISTICS
export const getMessageStats = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (!userId || !userType) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const [
      totalSent,
      totalReceived,
      unreadReceived,
      conversationCount,
      todayMessages,
    ] = await Promise.all([
      Message.countDocuments({ sender: userId }),
      Message.countDocuments({ receiver: userId }),
      Message.countDocuments({ receiver: userId, status: { $ne: "read" } }),
      Message.aggregate([
        {
          $match: {
            $or: [{ sender: userId }, { receiver: userId }],
            isBlocked: false,
          },
        },
        {
          $addFields: {
            otherEntity: {
              $cond: {
                if: { $eq: ["$sender", userId] },
                then: "$receiver",
                else: "$sender",
              },
            },
          },
        },
        {
          $group: { _id: "$otherEntity" },
        },
        {
          $count: "total",
        },
      ]).then((result) => result[0]?.total || 0),
      Message.countDocuments({
        $or: [{ sender: userId }, { receiver: userId }],
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    res.status(StatusCodes.OK).json(
      createResponse("Message statistics retrieved successfully", {
        sent: totalSent,
        received: totalReceived,
        unread: unreadReceived,
        conversations: conversationCount,
        today: todayMessages,
      })
    );
  }
);

// SEARCH MESSAGES
export const searchMessages = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { q: searchQuery, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    if (!searchQuery) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Search query is required", null));
    }

    const query = {
      $or: [{ sender: userId }, { receiver: userId }],
      messageType: "text",
      content: { $regex: searchQuery, $options: "i" },
      isBlocked: false,
    };

    const messages = await Message.find(query)
      .populate("sender", "fullname name email")
      .populate("receiver", "fullname name email")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Message.countDocuments(query);

    res.status(StatusCodes.OK).json(
      createResponse("Message search completed", {
        messages,
        searchQuery,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalResults: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// GET MEDIA MESSAGES
export const getMediaMessages = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const {
      otherEntityId,
      messageType = "image",
      page = 1,
      limit = 20,
    } = req.query;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const query: any = {
      $or: [
        { sender: userId, receiver: otherEntityId },
        { sender: otherEntityId, receiver: userId },
      ],
      messageType: { $in: ["image", "voice"] },
      isBlocked: false,
    };

    if (messageType && ["image", "voice"].includes(messageType as string)) {
      query.messageType = messageType;
    }

    const messages = await Message.find(query)
      .populate("sender", "fullname name")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Message.countDocuments(query);

    res.status(StatusCodes.OK).json(
      createResponse("Media messages retrieved successfully", {
        messages,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalMessages: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// Helper function to check blocking status
const checkBlockingStatus = async (
  senderId: string,
  receiverId: string,
  senderType: string,
  receiverType: string
): Promise<boolean> => {
  if (senderType === "User" && receiverType === "Pharmacy") {
    const user = await User.findById(senderId);
    const pharmacy = await Pharmacy.findById(receiverId);

    return (
      user?.blockedPharmacies.includes(
        new mongoose.Types.ObjectId(receiverId)
      ) ||
      user?.blockedByPharmacies.includes(
        new mongoose.Types.ObjectId(receiverId)
      ) ||
      pharmacy?.blockedUsers.includes(new mongoose.Types.ObjectId(senderId)) ||
      pharmacy?.blockedByUsers.includes(
        new mongoose.Types.ObjectId(senderId)
      ) ||
      false
    );
  }

  if (senderType === "Pharmacy" && receiverType === "User") {
    const pharmacy = await Pharmacy.findById(senderId);
    const user = await User.findById(receiverId);

    return (
      pharmacy?.blockedUsers.includes(
        new mongoose.Types.ObjectId(receiverId)
      ) ||
      pharmacy?.blockedByUsers.includes(
        new mongoose.Types.ObjectId(receiverId)
      ) ||
      user?.blockedPharmacies.includes(new mongoose.Types.ObjectId(senderId)) ||
      user?.blockedByPharmacies.includes(
        new mongoose.Types.ObjectId(senderId)
      ) ||
      false
    );
  }

  return false;
};
