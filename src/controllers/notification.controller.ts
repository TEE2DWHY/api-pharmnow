import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import Notification from "../models/Notification.model";
import User from "../models/User.model";
import createResponse from "../utils/createResponse.util";

// GET ALL NOTIFICATIONS FOR USER
export const getUserNotifications = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const {
      page = 1,
      limit = 20,
      read,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    // Build query
    const query: any = { userId };

    if (read !== undefined) {
      query.read = read === "true";
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const notifications = await Notification.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort(sort);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
    });

    res.status(StatusCodes.OK).json(
      createResponse("Notifications retrieved successfully", {
        notifications,
        unreadCount,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalNotifications: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// GET UNREAD NOTIFICATIONS COUNT
export const getUnreadCount = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
    });

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Unread count retrieved successfully", { unreadCount })
      );
  }
);

// GET NOTIFICATION BY ID
export const getNotificationById = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Notification not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Notification retrieved successfully", notification)
      );
  }
);

// CREATE NOTIFICATION (System/Admin use)
export const createNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const { userId, title, message } = req.body;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      read: false,
    });

    res
      .status(StatusCodes.CREATED)
      .json(createResponse("Notification created successfully", notification));
  }
);

// CREATE BULK NOTIFICATIONS (System/Admin use)
export const createBulkNotifications = asyncWrapper(
  async (req: Request, res: Response) => {
    const { userIds, title, message } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("User IDs array is required", null));
    }

    // Verify users exist
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Some user IDs are invalid", null));
    }

    // Create notifications for all users
    const notifications = userIds.map((userId) => ({
      userId,
      title,
      message,
      read: false,
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(StatusCodes.CREATED).json(
      createResponse(
        `${createdNotifications.length} notifications created successfully`,
        {
          count: createdNotifications.length,
          notifications: createdNotifications,
        }
      )
    );
  }
);

// MARK NOTIFICATION AS READ
export const markAsRead = asyncWrapper(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { read: true },
    { new: true }
  );

  if (!notification) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse("Notification not found", null));
  }

  res
    .status(StatusCodes.OK)
    .json(createResponse("Notification marked as read", notification));
});

// MARK NOTIFICATION AS UNREAD
export const markAsUnread = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: false },
      { new: true }
    );

    if (!notification) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Notification not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Notification marked as unread", notification));
  }
);

// MARK ALL NOTIFICATIONS AS READ
export const markAllAsRead = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    res.status(StatusCodes.OK).json(
      createResponse(`${result.modifiedCount} notifications marked as read`, {
        modifiedCount: result.modifiedCount,
      })
    );
  }
);

// DELETE NOTIFICATION
export const deleteNotification = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!notification) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Notification not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Notification deleted successfully", null));
  }
);

// DELETE ALL READ NOTIFICATIONS
export const deleteAllRead = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const result = await Notification.deleteMany({ userId, read: true });

    res.status(StatusCodes.OK).json(
      createResponse(`${result.deletedCount} read notifications deleted`, {
        deletedCount: result.deletedCount,
      })
    );
  }
);

// DELETE ALL NOTIFICATIONS FOR USER
export const deleteAllNotifications = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const result = await Notification.deleteMany({ userId });

    res.status(StatusCodes.OK).json(
      createResponse(`${result.deletedCount} notifications deleted`, {
        deletedCount: result.deletedCount,
      })
    );
  }
);

// GET RECENT NOTIFICATIONS (Last 7 days)
export const getRecentNotifications = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { limit = 10 } = req.query;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const notifications = await Notification.find({
      userId,
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res
      .status(StatusCodes.OK)
      .json(
        createResponse(
          "Recent notifications retrieved successfully",
          notifications
        )
      );
  }
);

// NOTIFICATION STATISTICS
export const getNotificationStats = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const [
      totalNotifications,
      unreadCount,
      readCount,
      todayCount,
      thisWeekCount,
    ] = await Promise.all([
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, read: false }),
      Notification.countDocuments({ userId, read: true }),
      Notification.countDocuments({
        userId,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      Notification.countDocuments({
        userId,
        createdAt: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      }),
    ]);

    res.status(StatusCodes.OK).json(
      createResponse("Notification statistics retrieved successfully", {
        total: totalNotifications,
        unread: unreadCount,
        read: readCount,
        today: todayCount,
        thisWeek: thisWeekCount,
        readPercentage:
          totalNotifications > 0
            ? Math.round((readCount / totalNotifications) * 100)
            : 0,
      })
    );
  }
);
