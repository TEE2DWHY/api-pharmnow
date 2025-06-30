import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import User from "../models/User.model";
import Pharmacy from "../models/Pharmacy.model";
import Product from "../models/Product.model";
import Order from "../models/Order.model";
import createResponse from "../utils/createResponse.util";
import Message from "../models/Message.model";

// GET ALL PHARMACIES
export const getAllPharmacies = asyncWrapper(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      search,
      isVerified,
      location,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const pharmacies = await Pharmacy.find(query)
      .populate("products", "name price category inStock images")
      .select("-blockedUsers -blockedByUsers")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort(sort);

    const total = await Pharmacy.countDocuments(query);

    res.status(StatusCodes.OK).json(
      createResponse("Pharmacies retrieved successfully", {
        pharmacies,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalPharmacies: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// GET PHARMACY BY ID
export const getPharmacyById = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const pharmacy = await Pharmacy.findById(id)
      .populate({
        path: "products",
        select: "name price description images category inStock quantity",
        options: { sort: { createdAt: -1 } },
      })
      .select("-blockedUsers -blockedByUsers");

    if (!pharmacy) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Pharmacy not found", null));
    }

    const [totalProducts, totalOrders, averageRating] = await Promise.all([
      Product.countDocuments({ pharmacyId: id }),
      Order.countDocuments({ pharmacyId: id }),
      Order.aggregate([
        {
          $match: {
            pharmacyId: pharmacy._id,
            "review.rating": { $exists: true },
          },
        },
        { $group: { _id: null, avgRating: { $avg: "$review.rating" } } },
      ]).then((result) => result[0]?.avgRating || 0),
    ]);

    const pharmacyWithStats = {
      ...pharmacy.toObject(),
      statistics: {
        totalProducts,
        totalOrders,
        averageRating: Math.round(averageRating * 10) / 10,
      },
    };

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Pharmacy retrieved successfully", pharmacyWithStats)
      );
  }
);

// UPDATE PHARMACY PROFILE
export const updatePharmacyProfile = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;
    const { name, location, contactNumber, phonenumber, referralCode, logo } =
      req.body;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(
          createResponse("Only pharmacies can update pharmacy profiles", null)
        );
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    if (referralCode) {
      const existingPharmacy = await Pharmacy.findOne({
        referralCode,
        _id: { $ne: pharmacyId },
      });

      if (existingPharmacy) {
        return res
          .status(StatusCodes.CONFLICT)
          .json(createResponse("Referral code already exists", null));
      }
    }

    const pharmacy = await Pharmacy.findByIdAndUpdate(
      pharmacyId,
      {
        ...(name && { name }),
        ...(location && { location }),
        ...(contactNumber && { contactNumber }),
        ...(phonenumber && { phonenumber }),
        ...(referralCode && { referralCode }),
        ...(logo && { logo }),
      },
      { new: true, runValidators: true }
    ).select("-blockedUsers -blockedByUsers");

    if (!pharmacy) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Pharmacy not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Pharmacy profile updated successfully", pharmacy));
  }
);

// GET PHARMACY PROFILE (Current logged-in pharmacy)
export const getPharmacyProfile = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can access this endpoint", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const pharmacy = await Pharmacy.findById(pharmacyId)
      .populate("products", "name price category inStock quantity")
      .select("-blockedUsers -blockedByUsers");

    if (!pharmacy) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Pharmacy not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Pharmacy profile retrieved successfully", pharmacy)
      );
  }
);

// ADD PRODUCT TO PHARMACY
export const addProduct = asyncWrapper(async (req: Request, res: Response) => {
  const pharmacyId = req.user?.userId;
  const userType = req.user?.userType;
  const productData = req.body;

  if (userType !== "Pharmacy") {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(createResponse("Only pharmacies can add products", null));
  }

  if (!pharmacyId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  // Create product with pharmacy reference
  const product = await Product.create({
    ...productData,
    pharmacyId,
  });

  await Pharmacy.findByIdAndUpdate(pharmacyId, {
    $push: { products: product._id },
  });

  res
    .status(StatusCodes.CREATED)
    .json(createResponse("Product added successfully", product));
});

// REMOVE PRODUCT FROM PHARMACY
export const removeProduct = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;
    const { productId } = req.params;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can remove products", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const product = await Product.findOne({ _id: productId, pharmacyId });
    if (!product) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          createResponse(
            "Product not found or doesn't belong to your pharmacy",
            null
          )
        );
    }

    await Product.findByIdAndDelete(productId);

    await Pharmacy.findByIdAndUpdate(pharmacyId, {
      $pull: { products: productId },
    });

    res
      .status(StatusCodes.OK)
      .json(createResponse("Product removed successfully", null));
  }
);

// GET PHARMACY PRODUCTS
export const getPharmacyProducts = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      category,
      inStock,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = { pharmacyId: id };

    if (category) {
      query.category = category;
    }

    if (inStock !== undefined) {
      query.inStock = inStock === "true";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const products = await Product.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort(sort);

    const total = await Product.countDocuments(query);

    res.status(StatusCodes.OK).json(
      createResponse("Pharmacy products retrieved successfully", {
        products,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalProducts: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      })
    );
  }
);

// BLOCK USER
export const blockUser = asyncWrapper(async (req: Request, res: Response) => {
  const pharmacyId = req.user?.userId;
  const userType = req.user?.userType;
  const { userId } = req.body;

  if (userType !== "Pharmacy") {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(createResponse("Only pharmacies can block users", null));
  }

  if (!pharmacyId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  const user = await User.findById(userId);
  if (!user) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse("User not found", null));
  }

  await Pharmacy.findByIdAndUpdate(pharmacyId, {
    $addToSet: { blockedUsers: userId },
  });

  await User.findByIdAndUpdate(userId, {
    $addToSet: { blockedByPharmacies: pharmacyId },
  });

  res
    .status(StatusCodes.OK)
    .json(createResponse("User blocked successfully", null));
});

// UNBLOCK USER
export const unblockUser = asyncWrapper(async (req: Request, res: Response) => {
  const pharmacyId = req.user?.userId;
  const userType = req.user?.userType;
  const { userId } = req.params;

  if (userType !== "Pharmacy") {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(createResponse("Only pharmacies can unblock users", null));
  }

  if (!pharmacyId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  await Pharmacy.findByIdAndUpdate(pharmacyId, {
    $pull: { blockedUsers: userId },
  });

  await User.findByIdAndUpdate(userId, {
    $pull: { blockedByPharmacies: pharmacyId },
  });

  res
    .status(StatusCodes.OK)
    .json(createResponse("User unblocked successfully", null));
});

// GET BLOCKED USERS
export const getBlockedUsers = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can access this endpoint", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const pharmacy = await Pharmacy.findById(pharmacyId).populate(
      "blockedUsers",
      "fullname email phonenumber"
    );

    if (!pharmacy) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Pharmacy not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        createResponse(
          "Blocked users retrieved successfully",
          pharmacy.blockedUsers
        )
      );
  }
);

// GET PHARMACY DASHBOARD STATS
export const getPharmacyDashboard = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can access dashboard", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const [
      totalProducts,
      inStockProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue,
      averageRating,
      totalMessages,
    ] = await Promise.all([
      Product.countDocuments({ pharmacyId }),
      Product.countDocuments({ pharmacyId, inStock: true }),
      Product.countDocuments({ pharmacyId, inStock: false }),
      Order.countDocuments({ pharmacyId }),
      Order.countDocuments({ pharmacyId, status: "pending" }),
      Order.countDocuments({ pharmacyId, status: "delivered" }),
      Order.aggregate([
        { $match: { pharmacyId, status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]).then((result) => result[0]?.total || 0),
      Order.aggregate([
        { $match: { pharmacyId, "review.rating": { $exists: true } } },
        { $group: { _id: null, avgRating: { $avg: "$review.rating" } } },
      ]).then((result) => result[0]?.avgRating || 0),
      Message.countDocuments({
        $or: [
          { sender: pharmacyId, senderType: "Pharmacy" },
          { receiver: pharmacyId, receiverType: "Pharmacy" },
        ],
      }),
    ]);

    res.status(StatusCodes.OK).json(
      createResponse("Dashboard stats retrieved successfully", {
        products: {
          total: totalProducts,
          inStock: inStockProducts,
          outOfStock: outOfStockProducts,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          delivered: deliveredOrders,
        },
        financials: {
          totalRevenue,
          averageRating: Math.round(averageRating * 10) / 10,
        },
        communication: {
          totalMessages,
        },
      })
    );
  }
);

// SEARCH PHARMACIES (Public)
export const searchPharmacies = asyncWrapper(
  async (req: Request, res: Response) => {
    const {
      query: searchQuery,
      location,
      radius = 10,
      page = 1,
      limit = 10,
    } = req.query;

    // Build search query
    const query: any = { isVerified: true };

    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { location: { $regex: searchQuery, $options: "i" } },
      ];
    }

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    const pharmacies = await Pharmacy.find(query)
      .populate("products", "name price category inStock")
      .select("name location contactNumber email phonenumber logo isVerified")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ isVerified: -1, createdAt: -1 });

    const total = await Pharmacy.countDocuments(query);

    res.status(StatusCodes.OK).json(
      createResponse("Pharmacies search completed", {
        pharmacies,
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

// DELETE PHARMACY ACCOUNT
export const deletePharmacyAccount = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;
    const { confirmationText } = req.body;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(
          createResponse("Only pharmacies can delete their accounts", null)
        );
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    if (confirmationText !== "DELETE MY PHARMACY ACCOUNT") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Please provide correct confirmation text", null));
    }

    const pendingOrders = await Order.countDocuments({
      pharmacyId,
      status: { $in: ["pending", "confirmed", "preparing", "shipped"] },
    });

    if (pendingOrders > 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse(
            `Cannot delete account. You have ${pendingOrders} pending orders`,
            null
          )
        );
    }

    await Product.deleteMany({ pharmacyId });

    await User.updateMany(
      { favouritePharmacies: pharmacyId },
      { $pull: { favouritePharmacies: pharmacyId } }
    );

    await Pharmacy.findByIdAndDelete(pharmacyId);

    res
      .status(StatusCodes.OK)
      .json(createResponse("Pharmacy account deleted successfully", null));
  }
);
