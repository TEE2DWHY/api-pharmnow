import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import Order from "../models/Order.model";
import createResponse from "../utils/createResponse.util";
import Pharmacy from "../models/Pharmacy.model";
import Product from "../models/Product.model";

// GET USER ORDERS
export const getUserOrders = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userType = req.user?.userType;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    if (userType !== "User") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only users can access this endpoint", null));
    }

    const query: any = { userId };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const orders = await Order.find(query)
      .populate("pharmacyId", "name location logo email phonenumber")
      .populate("products.productId", "name price imageUrl category")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.status(StatusCodes.OK).json(
      createResponse("User orders retrieved successfully", {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalOrders: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// GET PHARMACY ORDERS
export const getPharmacyOrders = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can access this endpoint", null));
    }

    const query: any = { pharmacyId };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const orders = await Order.find(query)
      .populate("userId", "fullname email phonenumber deliveryAddress")
      .populate("products.productId", "name price imageUrl category")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.status(StatusCodes.OK).json(
      createResponse("Pharmacy orders retrieved successfully", {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalOrders: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// GET ORDER BY ID
export const getOrderById = asyncWrapper(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (!userId || !userType) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const order = await Order.findById(orderId)
      .populate("userId", "fullname email phonenumber deliveryAddress")
      .populate("pharmacyId", "name location logo email phonenumber")
      .populate("products.productId", "name price imageUrl category");

    if (!order) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Order not found", null));
    }

    const isAuthorized =
      (userType === "User" && order.userId._id.toString() === userId) ||
      (userType === "Pharmacy" && order.pharmacyId._id.toString() === userId);

    if (!isAuthorized) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(
          createResponse(
            "Access denied. You can only view your own orders",
            null
          )
        );
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Order retrieved successfully", order));
  }
);

// CREATE ORDER
export const createOrder = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userType = req.user?.userType;
  const {
    pharmacyId,
    products,
    deliveryAddress,
    deliveryType = "delivery",
    paymentMethod,
    notes,
  } = req.body;

  if (userType !== "User") {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(createResponse("Only users can create orders", null));
  }

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse("Pharmacy not found", null));
  }

  let totalPrice = 0;
  const validatedProducts = [];

  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          createResponse(`Product with ID ${item.productId} not found`, null)
        );
    }

    if (product.pharmacyId.toString() !== pharmacyId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse(
            `Product ${product.name} does not belong to this pharmacy`,
            null
          )
        );
    }

    if (
      product.stockStatus === "out_of_stock" ||
      product.stockQuantity < item.quantity
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse(`Insufficient stock for product ${product.name}`, null)
        );
    }

    totalPrice += product.price * item.quantity;

    validatedProducts.push({
      productId: item.productId,
      quantity: item.quantity,
      priceAtTime: product.price,
    });
  }

  const order = await Order.create({
    userId,
    pharmacyId,
    products: validatedProducts,
    totalPrice,
    deliveryAddress,
    deliveryType,
    paymentMethod,
    notes,
    status: "pending",
    paymentStatus: "pending",
  });

  for (const item of validatedProducts) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stockQuantity: -item.quantity },
    });
  }

  const populatedOrder = await Order.findById(order._id)
    .populate("pharmacyId", "name location logo email phonenumber")
    .populate("products.productId", "name price imageUrl category")
    .populate("userId", "fullname email phonenumber");

  res
    .status(StatusCodes.CREATED)
    .json(createResponse("Order created successfully", populatedOrder));
});

// CANCEL ORDER
export const cancelOrder = asyncWrapper(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const userId = req.user?.userId;
  const userType = req.user?.userType;

  const order = await Order.findById(orderId);
  if (!order) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse("Order not found", null));
  }

  const isOwner =
    (userType === "User" && order.userId.toString() === userId) ||
    (userType === "Pharmacy" && order.pharmacyId.toString() === userId);

  if (!isOwner) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(createResponse("You can only cancel your own orders", null));
  }

  if (!order.canBeCancelled()) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        createResponse(
          "This order cannot be cancelled at its current status",
          null
        )
      );
  }

  for (const item of order.products) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stockQuantity: item.quantity },
    });
  }

  order.status = "cancelled";
  order.cancellationReason = reason;
  (order.cancelledBy as string) = userType.toLowerCase();
  await order.save();

  res
    .status(StatusCodes.OK)
    .json(createResponse("Order cancelled successfully", order));
});

// DECLINE ORDER
export const declineOrder = asyncWrapper(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can decline orders", null));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Order not found", null));
    }

    if (order.pharmacyId.toString() !== userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("You can only decline your own orders", null));
    }

    if (!order.canBeDeclined()) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse("Order cannot be declined at current status", null)
        );
    }

    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQuantity: item.quantity },
      });
    }

    order.status = "declined";
    order.declineReason = reason;
    order.cancelledBy = "pharmacy";
    await order.save();

    res
      .status(StatusCodes.OK)
      .json(createResponse("Order declined successfully", order));
  }
);

// ADD REVIEW
export const addOrderReview = asyncWrapper(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "User") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only users can add reviews", null));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Order not found", null));
    }

    if (order.userId.toString() !== userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("You can only review your own orders", null));
    }

    if (!order.canBeReviewed()) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("This order cannot be reviewed", null));
    }

    order.review = { rating, comment, createdAt: new Date() };
    await order.save();

    res
      .status(StatusCodes.OK)
      .json(createResponse("Review added successfully", order));
  }
);

// UPDATE STATUS (pharmacy)
export const updateOrderStatus = asyncWrapper(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can update order status", null));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Order not found", null));
    }

    if (order.pharmacyId.toString() !== userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Unauthorized", null));
    }

    order.status = status;
    if (status === "delivered") order.actualDelivery = new Date();
    await order.save();

    res
      .status(StatusCodes.OK)
      .json(createResponse("Order status updated successfully", order));
  }
);

// ORDER STATS
export const getOrderStatistics = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (!userId || !userType) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const matchQuery: any =
      userType === "User" ? { userId } : { pharmacyId: userId };

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      preparingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
    ] = await Promise.all([
      Order.countDocuments(matchQuery),
      Order.countDocuments({ ...matchQuery, status: "pending" }),
      Order.countDocuments({ ...matchQuery, status: "confirmed" }),
      Order.countDocuments({ ...matchQuery, status: "preparing" }),
      Order.countDocuments({ ...matchQuery, status: "delivered" }),
      Order.countDocuments({ ...matchQuery, status: "cancelled" }),
      Order.aggregate([
        {
          $match: {
            ...matchQuery,
            status: { $nin: ["cancelled", "declined"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]).then((res) => res[0]?.total || 0),
    ]);

    res.status(StatusCodes.OK).json(
      createResponse("Order statistics retrieved successfully", {
        totalOrders,
        ordersByStatus: {
          pending: pendingOrders,
          confirmed: confirmedOrders,
          preparing: preparingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        totalRevenue,
      })
    );
  }
);
