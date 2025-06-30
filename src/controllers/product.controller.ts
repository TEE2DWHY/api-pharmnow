import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import User from "../models/User.model";
import Pharmacy from "../models/Pharmacy.model";
import Product from "../models/Product.model";
import Order from "../models/Order.model";
import createResponse from "../utils/createResponse.util";

// GET ALL PRODUCTS
export const getAllProducts = asyncWrapper(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      pharmacyId,
      prescriptionRequired,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { manufacturer: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (inStock !== undefined) {
      query.inStock = inStock === "true";
    }

    if (pharmacyId) {
      query.pharmacyId = pharmacyId;
    }

    if (prescriptionRequired !== undefined) {
      query.prescriptionRequired = prescriptionRequired === "true";
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const products = await Product.find(query)
      .populate("pharmacyId", "name location logo isVerified")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort(sort);

    const total = await Product.countDocuments(query);

    const categories = await Product.distinct("category");

    res.status(StatusCodes.OK).json(
      createResponse("Products retrieved successfully", {
        products,
        categories,
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

// GET PRODUCT BY ID
export const getProductById = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await Product.findById(id).populate(
      "pharmacyId",
      "name location contactNumber email phonenumber logo isVerified"
    );

    if (!product) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Product not found", null));
    }

    const relatedProducts = await Product.find({
      pharmacyId: product.pharmacyId,
      _id: { $ne: id },
      inStock: true,
    })
      .limit(6)
      .select("name price images category");

    const orderCount = await Order.countDocuments({
      "products.productId": id,
      status: "delivered",
    });

    const productWithStats = {
      ...product.toObject(),
      relatedProducts,
      statistics: {
        totalOrders: orderCount,
      },
    };

    res
      .status(StatusCodes.OK)
      .json(createResponse("Product retrieved successfully", productWithStats));
  }
);

// CREATE PRODUCT (Pharmacy only)
export const createProduct = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;
    const productData = req.body;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can create products", null));
    }

    if (!pharmacyId) {
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

    const product = await Product.create({
      ...productData,
      pharmacyId,
    });

    await Pharmacy.findByIdAndUpdate(pharmacyId, {
      $push: { products: product._id },
    });

    const populatedProduct = await Product.findById(product._id).populate(
      "pharmacyId",
      "name location logo"
    );

    res
      .status(StatusCodes.CREATED)
      .json(createResponse("Product created successfully", populatedProduct));
  }
);

// UPDATE PRODUCT (Pharmacy only)
export const updateProduct = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;
    const updateData = req.body;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can update products", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const product = await Product.findOne({ _id: id, pharmacyId });
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

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("pharmacyId", "name location logo");

    res
      .status(StatusCodes.OK)
      .json(createResponse("Product updated successfully", updatedProduct));
  }
);

// DELETE PRODUCT (Pharmacy only)
export const deleteProduct = asyncWrapper(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can delete products", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const product = await Product.findOne({ _id: id, pharmacyId });
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

    const pendingOrders = await Order.countDocuments({
      "products.productId": id,
      status: { $in: ["pending", "confirmed", "preparing"] },
    });

    if (pendingOrders > 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse(
            `Cannot delete product. It has ${pendingOrders} pending orders`,
            null
          )
        );
    }

    await User.updateMany(
      { favouriteProducts: id },
      { $pull: { favouriteProducts: id } }
    );

    await Pharmacy.findByIdAndUpdate(pharmacyId, { $pull: { products: id } });

    await Product.findByIdAndDelete(id);

    res
      .status(StatusCodes.OK)
      .json(createResponse("Product deleted successfully", null));
  }
);

// SEARCH PRODUCTS
export const searchProducts = asyncWrapper(
  async (req: Request, res: Response) => {
    const {
      q: searchQuery,
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      location,
      prescriptionRequired,
    } = req.query;

    if (!searchQuery) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Search query is required", null));
    }

    const query: any = {
      $and: [
        {
          $or: [
            { name: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
            { manufacturer: { $regex: searchQuery, $options: "i" } },
            { category: { $regex: searchQuery, $options: "i" } },
          ],
        },
        { inStock: true },
      ],
    };

    if (category) {
      query.$and.push({ category: { $regex: category, $options: "i" } });
    }

    if (minPrice || maxPrice) {
      const priceQuery: any = {};
      if (minPrice) priceQuery.$gte = Number(minPrice);
      if (maxPrice) priceQuery.$lte = Number(maxPrice);
      query.$and.push({ price: priceQuery });
    }

    if (prescriptionRequired !== undefined) {
      query.$and.push({
        prescriptionRequired: prescriptionRequired === "true",
      });
    }

    let aggregationPipeline: any[] = [
      { $match: query },
      {
        $lookup: {
          from: "pharmacies",
          localField: "pharmacyId",
          foreignField: "_id",
          as: "pharmacy",
        },
      },
      { $unwind: "$pharmacy" },
      { $match: { "pharmacy.isVerified": true } },
    ];

    if (location) {
      aggregationPipeline.push({
        $match: { "pharmacy.location": { $regex: location, $options: "i" } },
      });
    }

    aggregationPipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
      { $sort: { createdAt: -1 } }
    );

    const products = await Product.aggregate(aggregationPipeline);

    const totalPipeline = aggregationPipeline.slice(0, -3);
    totalPipeline.push({ $count: "total" });
    const totalResult = await Product.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.status(StatusCodes.OK).json(
      createResponse("Product search completed", {
        products,
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

export const getProductsByCategory = asyncWrapper(
  async (req: Request, res: Response) => {
    const { category } = req.params;
    const {
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const products = await Product.find({
      category: { $regex: category, $options: "i" },
      inStock: true,
    })
      .populate("pharmacyId", "name location logo isVerified")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort(sort);

    const total = await Product.countDocuments({
      category: { $regex: category, $options: "i" },
      inStock: true,
    });

    res.status(StatusCodes.OK).json(
      createResponse(
        `Products in ${category} category retrieved successfully`,
        {
          products,
          category,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalProducts: total,
            hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
            hasPrevPage: Number(page) > 1,
          },
        }
      )
    );
  }
);

// GET FEATURED PRODUCTS
export const getFeaturedProducts = asyncWrapper(
  async (req: Request, res: Response) => {
    const { limit = 8 } = req.query;

    const featuredProducts = await Product.aggregate([
      { $match: { inStock: true } },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            { $unwind: "$products" },
            {
              $match: {
                $expr: { $eq: ["$products.productId", "$$productId"] },
                status: "delivered",
              },
            },
            { $group: { _id: "$products.productId", orderCount: { $sum: 1 } } },
          ],
          as: "orderStats",
        },
      },
      {
        $lookup: {
          from: "pharmacies",
          localField: "pharmacyId",
          foreignField: "_id",
          as: "pharmacy",
        },
      },
      { $unwind: "$pharmacy" },
      { $match: { "pharmacy.isVerified": true } },
      {
        $addFields: {
          orderCount: {
            $ifNull: [{ $arrayElemAt: ["$orderStats.orderCount", 0] }, 0],
          },
          score: {
            $add: [
              { $ifNull: [{ $arrayElemAt: ["$orderStats.orderCount", 0] }, 0] },
              { $multiply: ["$pharmacy.isVerified", 10] },
            ],
          },
        },
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $limit: Number(limit) },
      {
        $project: {
          name: 1,
          description: 1,
          price: 1,
          images: 1,
          category: 1,
          inStock: 1,
          prescriptionRequired: 1,
          "pharmacy.name": 1,
          "pharmacy.location": 1,
          "pharmacy.logo": 1,
          orderCount: 1,
        },
      },
    ]);

    res
      .status(StatusCodes.OK)
      .json(
        createResponse(
          "Featured products retrieved successfully",
          featuredProducts
        )
      );
  }
);

// GET PRODUCT CATEGORIES
export const getProductCategories = asyncWrapper(
  async (req: Request, res: Response) => {
    const categories = await Product.aggregate([
      { $match: { inStock: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          category: "$_id",
          productCount: "$count",
          averagePrice: { $round: ["$avgPrice", 2] },
          priceRange: {
            min: { $round: ["$minPrice", 2] },
            max: { $round: ["$maxPrice", 2] },
          },
          _id: 0,
        },
      },
    ]);

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Product categories retrieved successfully", categories)
      );
  }
);

// BULK UPDATE PRODUCTS (Pharmacy only)
export const bulkUpdateProducts = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;
    const { productIds, updateData } = req.body;

    if (userType !== "Pharmacy") {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(createResponse("Only pharmacies can bulk update products", null));
    }

    if (!pharmacyId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Product IDs array is required", null));
    }

    const result = await Product.updateMany(
      {
        _id: { $in: productIds },
        pharmacyId,
      },
      updateData,
      { runValidators: true }
    );

    res.status(StatusCodes.OK).json(
      createResponse(`${result.modifiedCount} products updated successfully`, {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      })
    );
  }
);

// GET LOW STOCK PRODUCTS (Pharmacy only)
export const getLowStockProducts = asyncWrapper(
  async (req: Request, res: Response) => {
    const pharmacyId = req.user?.userId;
    const userType = req.user?.userType;
    const { threshold = 10 } = req.query;

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

    const lowStockProducts = await Product.find({
      pharmacyId,
      quantity: { $lte: Number(threshold) },
      inStock: true,
    })
      .sort({ quantity: 1 })
      .select("name quantity category price images");

    res.status(StatusCodes.OK).json(
      createResponse("Low stock products retrieved successfully", {
        products: lowStockProducts,
        threshold: Number(threshold),
        count: lowStockProducts.length,
      })
    );
  }
);
