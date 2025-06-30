import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import createResponse from "../utils/createResponse.util";
import User from "../models/User.model";
import Pharmacy from "../models/Pharmacy.model";
import Product from "../models/Product.model";
import Order from "../models/Order.model";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import Cart from "../models/Cart.model";

// CREATE ORDER
export const createOrder = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { pharmacyId, products, deliveryAddress, paymentMethod, notes } =
    req.body;

  if (!userId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
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

    if (Number(product.stockQuantity) < item.quantity) {
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
    });
  }

  const order = await Order.create({
    userId,
    pharmacyId,
    products: validatedProducts,
    totalPrice,
    deliveryAddress,
    paymentMethod,
    notes,
    status: "pending",
    paymentStatus: "pending",
  });

  for (const item of validatedProducts) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { quantity: -item.quantity },
    });
  }

  await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });

  await Cart.findOneAndUpdate(
    { userId },
    {
      $pull: {
        products: {
          productId: { $in: validatedProducts.map((p) => p.productId) },
        },
      },
    }
  );

  const populatedOrder = await Order.findById(order._id)
    .populate("pharmacyId", "name location logo email phonenumber")
    .populate("products.productId", "name price images description")
    .populate("userId", "fullname email phonenumber");

  res
    .status(StatusCodes.CREATED)
    .json(createResponse("Order created successfully", populatedOrder));
});

// GET ALL ORDERS (Admin/Pharmacy)
export const getAllOrders = asyncWrapper(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      status,
      pharmacyId,
      userId: queryUserId,
    } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (pharmacyId) query.pharmacyId = pharmacyId;
    if (queryUserId) query.userId = queryUserId;

    const orders = await Order.find(query)
      .populate("userId", "fullname email phonenumber deliveryAddress")
      .populate("pharmacyId", "name location logo email phonenumber")
      .populate("products.productId", "name price images")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.status(StatusCodes.OK).json(
      createResponse("Orders retrieved successfully", {
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
    const { id } = req.params;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    const order = await Order.findById(id)
      .populate("userId", "fullname email phonenumber deliveryAddress")
      .populate("pharmacyId", "name location logo email phonenumber")
      .populate("products.productId", "name price images description");

    if (!order) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Order not found", null));
    }

    if (userType === "User" && order.userId._id.toString() !== userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(
          createResponse(
            "Access denied. You can only view your own orders",
            null
          )
        );
    }

    if (userType === "Pharmacy" && order.pharmacyId._id.toString() !== userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(
          createResponse(
            "Access denied. You can only view orders from your pharmacy",
            null
          )
        );
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Order retrieved successfully", order));
  }
);

export const updateOrderStatus = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, estimatedDelivery } = req.body;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can update order status", null));
    }

    const order = await Order.findById(id);
    if (!order) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Order not found", null));
    }

    if (order.pharmacyId.toString() !== userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(
          createResponse("You can only update orders from your pharmacy", null)
        );
    }

    const validTransitions: { [key: string]: string[] } = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["picked_up", "shipped"],
      picked_up: ["delivered"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse(
            `Cannot transition from ${order.status} to ${status}`,
            null
          )
        );
    }

    const updateData: any = { status };

    if (estimatedDelivery) {
      updateData.estimatedDelivery = estimatedDelivery;
    }

    if (status === "delivered") {
      updateData.actualDelivery = new Date();
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("userId", "fullname email phonenumber")
      .populate("pharmacyId", "name location")
      .populate("products.productId", "name price");

    res
      .status(StatusCodes.OK)
      .json(createResponse("Order status updated successfully", updatedOrder));
  }
);

export const cancelOrder = asyncWrapper(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user?.userId;
  const userType = req.user?.userType;

  const order = await Order.findById(id);
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

  if (!["pending", "confirmed"].includes(order.status)) {
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
      $inc: { quantity: item.quantity },
    });
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    id,
    {
      status: "cancelled",
      notes: reason
        ? `${order.notes || ""}\nCancellation reason: ${reason}`.trim()
        : order.notes,
    },
    { new: true }
  )
    .populate("userId", "fullname email")
    .populate("pharmacyId", "name location")
    .populate("products.productId", "name price");

  res
    .status(StatusCodes.OK)
    .json(createResponse("Order cancelled successfully", updatedOrder));
});

// ADD ORDER REVIEW (User only)
export const addOrderReview = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "User") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only users can add reviews", null));
    }

    const order = await Order.findById(id);
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

    if (order.status !== "delivered") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("You can only review delivered orders", null));
    }

    if (order.review?.rating) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("This order has already been reviewed", null));
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        review: { rating, comment },
      },
      { new: true }
    )
      .populate("pharmacyId", "name location")
      .populate("products.productId", "name");

    res
      .status(StatusCodes.OK)
      .json(createResponse("Review added successfully", updatedOrder));
  }
);

// GET USER'S ORDERS
export const getUserOrders = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { page = 1, limit = 10, status } = req.query;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const query: any = { userId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate("pharmacyId", "name location logo email phonenumber")
      .populate("products.productId", "name price images")
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

// GET PHARMACY'S ORDERS
export const getPharmacyOrders = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const { page = 1, limit = 10, status } = req.query;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can access this endpoint", null));
    }

    const query: any = { pharmacyId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate("userId", "fullname email phonenumber deliveryAddress")
      .populate("products.productId", "name price images")
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

// GET ORDER STATISTICS
export const getOrderStatistics = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    let matchQuery: any = {};

    if (userType === "User") {
      matchQuery = { userId };
    } else if (userType === "Pharmacy") {
      matchQuery = { pharmacyId: userId };
    }

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      preparingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
    ] = await Promise.all([
      Order.countDocuments(matchQuery),
      Order.countDocuments({ ...matchQuery, status: "pending" }),
      Order.countDocuments({ ...matchQuery, status: "confirmed" }),
      Order.countDocuments({ ...matchQuery, status: "preparing" }),
      Order.countDocuments({ ...matchQuery, status: "shipped" }),
      Order.countDocuments({ ...matchQuery, status: "delivered" }),
      Order.countDocuments({ ...matchQuery, status: "cancelled" }),
      Order.aggregate([
        { $match: { ...matchQuery, status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]).then((result) => result[0]?.total || 0),
    ]);

    res.status(StatusCodes.OK).json(
      createResponse("Order statistics retrieved successfully", {
        totalOrders,
        ordersByStatus: {
          pending: pendingOrders,
          confirmed: confirmedOrders,
          preparing: preparingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        totalRevenue,
      })
    );
  }
);

// UPDATE PAYMENT STATUS (Internal use)
export const updatePaymentStatus = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentStatus, transactionId } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      {
        paymentStatus,
        ...(transactionId && { transactionId }),
      },
      { new: true }
    );

    if (!order) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Order not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Payment status updated successfully", order));
  }
);
