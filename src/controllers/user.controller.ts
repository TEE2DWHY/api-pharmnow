import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import createResponse from "../utils/createResponse.util";
import User from "../models/User.model";
import Pharmacy from "../models/Pharmacy.model";
import Product from "../models/Product.model";
import Order from "../models/Order.model";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";

// GET ALL USERS (Admin only - you might want to add admin auth)
export const getAllUsers = asyncWrapper(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, isVerified } = req.query;

  const query: any = {};

  if (search) {
    query.$or = [
      { fullname: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phonenumber: { $regex: search, $options: "i" } },
    ];
  }

  if (isVerified !== undefined) {
    query.isVerified = isVerified === "true";
  }

  const users = await User.find(query)
    .select(
      "-password -verificationCode -resetPasswordCode -resetPasswordExpires -cardDetails.cvv"
    )
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  res.status(StatusCodes.OK).json(
    createResponse("Users retrieved successfully", {
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalUsers: total,
        hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
        hasPrevPage: Number(page) > 1,
      },
    })
  );
});

// GET USER BY ID
export const getUserById = asyncWrapper(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select(
      "-password -verificationCode -resetPasswordCode -resetPasswordExpires -cardDetails.cvv"
    )
    .populate("favouritePharmacies", "name location email phonenumber logo")
    .populate("favouriteProducts", "name price description images")
    .populate("orders", "orderCode totalPrice status createdAt");

  if (!user) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse("User not found", null));
  }

  res
    .status(StatusCodes.OK)
    .json(createResponse("User retrieved successfully", user));
});

// UPDATE USER PROFILE
export const updateProfile = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { fullname, phonenumber, deliveryAddress } = req.body;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        ...(fullname && { fullname }),
        ...(phonenumber && { phonenumber }),
        ...(deliveryAddress && { deliveryAddress }),
      },
      { new: true, runValidators: true }
    ).select(
      "-password -verificationCode -resetPasswordCode -resetPasswordExpires"
    );

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Profile updated successfully", user));
  }
);

// UPDATE CARD DETAILS
export const updateCardDetails = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { cardNumber, cardHolderName, expiryDate, cvv } = req.body;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        cardDetails: {
          cardNumber,
          cardHolderName,
          expiryDate,
          cvv,
        },
      },
      { new: true, runValidators: true }
    ).select(
      "-password -verificationCode -resetPasswordCode -resetPasswordExpires -cardDetails.cvv"
    );

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(createResponse("Card details updated successfully", user));
  }
);

// ADD PHARMACY TO FAVOURITES
export const addFavouritePharmacy = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { pharmacyId } = req.body;

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

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    if (user.favouritePharmacies.includes(pharmacyId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Pharmacy already in favourites", null));
    }

    user.favouritePharmacies.push(pharmacyId);
    await user.save();

    res
      .status(StatusCodes.OK)
      .json(createResponse("Pharmacy added to favourites successfully", null));
  }
);

// REMOVE PHARMACY FROM FAVOURITES
export const removeFavouritePharmacy = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { pharmacyId } = req.params;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { favouritePharmacies: pharmacyId } },
      { new: true }
    );

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Pharmacy removed from favourites successfully", null)
      );
  }
);

// ADD PRODUCT TO FAVOURITES
export const addFavouriteProduct = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { productId } = req.body;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Product not found", null));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    if (user.favouriteProducts.includes(productId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Product already in favourites", null));
    }

    user.favouriteProducts.push(productId);
    await user.save();

    res
      .status(StatusCodes.OK)
      .json(createResponse("Product added to favourites successfully", null));
  }
);

// REMOVE PRODUCT FROM FAVOURITES
export const removeFavouriteProduct = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { productId } = req.params;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { favouriteProducts: productId } },
      { new: true }
    );

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Product removed from favourites successfully", null)
      );
  }
);

// GET USER'S FAVOURITE PHARMACIES
export const getFavouritePharmacies = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findById(userId).populate({
      path: "favouritePharmacies",
      select: "name location email phonenumber logo isVerified",
      populate: {
        path: "products",
        select: "name price",
        options: { limit: 5 },
      },
    });

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        createResponse(
          "Favourite pharmacies retrieved successfully",
          user.favouritePharmacies
        )
      );
  }
);

// GET USER'S FAVOURITE PRODUCTS
export const getFavouriteProducts = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findById(userId).populate({
      path: "favouriteProducts",
      select: "name price description images category inStock",
      populate: {
        path: "pharmacyId",
        select: "name location",
      },
    });

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        createResponse(
          "Favourite products retrieved successfully",
          user.favouriteProducts
        )
      );
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
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate("pharmacyId", "name location logo")
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

// BLOCK PHARMACY
export const blockPharmacy = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { pharmacyId } = req.body;

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

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { blockedPharmacies: pharmacyId } },
      { new: true }
    );

    await Pharmacy.findByIdAndUpdate(pharmacyId, {
      $addToSet: { blockedByUsers: userId },
    });

    res
      .status(StatusCodes.OK)
      .json(createResponse("Pharmacy blocked successfully", null));
  }
);

// UNBLOCK PHARMACY
export const unblockPharmacy = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { pharmacyId } = req.params;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { blockedPharmacies: pharmacyId },
    });

    await Pharmacy.findByIdAndUpdate(pharmacyId, {
      $pull: { blockedByUsers: userId },
    });

    res
      .status(StatusCodes.OK)
      .json(createResponse("Pharmacy unblocked successfully", null));
  }
);

// GET BLOCKED PHARMACIES
export const getBlockedPharmacies = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findById(userId).populate(
      "blockedPharmacies",
      "name location email phonenumber logo"
    );

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    res
      .status(StatusCodes.OK)
      .json(
        createResponse(
          "Blocked pharmacies retrieved successfully",
          user.blockedPharmacies
        )
      );
  }
);

// DELETE USER ACCOUNT
export const deleteAccount = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { password } = req.body;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("User not found", null));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Incorrect password", null));
    }

    await User.findByIdAndDelete(userId);

    res
      .status(StatusCodes.OK)
      .json(createResponse("Account deleted successfully", null));
  }
);

// GET USER DASHBOARD STATS
export const getDashboardStats = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      favouritePharmaciesCount,
      favouriteProductsCount,
    ] = await Promise.all([
      Order.countDocuments({ userId }),
      Order.countDocuments({ userId, status: "pending" }),
      Order.countDocuments({ userId, status: "delivered" }),
      User.findById(userId).then(
        (user) => user?.favouritePharmacies.length || 0
      ),
      User.findById(userId).then((user) => user?.favouriteProducts.length || 0),
    ]);

    res.status(StatusCodes.OK).json(
      createResponse("Dashboard stats retrieved successfully", {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        favouritePharmaciesCount,
        favouriteProductsCount,
      })
    );
  }
);
