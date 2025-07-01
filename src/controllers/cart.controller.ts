import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import User from "../models/User.model";
import createResponse from "../utils/createResponse.util";
import asyncWrapper from "../middlewares/asyncWrapper.middleware";
import Cart from "../models/Cart.model";
import Product, { IProduct } from "../models/Product.model";
import { recalculateCartTotal } from "../helper/cartHelper";

// GET USER'S CART
export const getCart = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  let cart = await Cart.findOne({ userId }).populate({
    path: "products.productId",
    select:
      "name price imageUrl category stockStatus stockQuantity pharmacyId tier",
    populate: {
      path: "pharmacyId",
      select: "name location logo",
    },
  });

  if (!cart) {
    cart = await Cart.create({
      userId,
      products: [],
      totalPrice: 0,
    });
  }

  let totalPrice = 0;
  const validProducts = [];

  for (const item of cart.products) {
    const product = item.productId as any as IProduct;

    if (
      product &&
      product.stockStatus !== "out_of_stock" &&
      product.stockQuantity >= item.quantity
    ) {
      totalPrice += product.price * item.quantity;
      validProducts.push(item);
    }
  }

  if (
    validProducts.length !== cart.products.length ||
    cart.totalPrice !== totalPrice
  ) {
    cart.products = validProducts;
    cart.totalPrice = totalPrice;
    await cart.save();
  }

  res.status(StatusCodes.OK).json(
    createResponse("Cart retrieved successfully", {
      cart,
      itemCount: cart.products.length,
      totalPrice: cart.totalPrice,
    })
  );
});

// ADD ITEM TO CART
export const addToCart = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { productId, quantity = 1 } = req.body;

  if (!userId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  const product = (await Product.findById(productId).populate(
    "pharmacyId",
    "name"
  )) as IProduct | null;

  if (!product) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse("Product not found", null));
  }

  if (product.stockStatus === "out_of_stock") {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createResponse("Product is currently out of stock", null));
  }

  if (product.stockQuantity < quantity) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        createResponse(
          `Only ${product.stockQuantity} items available in stock`,
          null
        )
      );
  }

  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({
      userId,
      products: [],
      totalPrice: 0,
    });
  }

  const existingItemIndex = cart.products.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (existingItemIndex > -1) {
    const newQuantity = cart.products[existingItemIndex].quantity + quantity;

    if (newQuantity > product.stockQuantity) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse(
            `Cannot add ${quantity} more items. Only ${
              product.stockQuantity - cart.products[existingItemIndex].quantity
            } more available`,
            null
          )
        );
    }

    cart.products[existingItemIndex].quantity = newQuantity;
  } else {
    cart.products.push({
      productId,
      quantity,
    });
  }

  await recalculateCartTotal(cart);
  await cart.save();

  const populatedCart = await Cart.findById(cart._id).populate({
    path: "products.productId",
    select: "name price imageUrl category pharmacyId tier",
    populate: {
      path: "pharmacyId",
      select: "name location",
    },
  });

  res.status(StatusCodes.OK).json(
    createResponse("Item added to cart successfully", {
      cart: populatedCart,
      addedItem: {
        product: {
          id: product._id,
          name: product.name,
          price: product.price,
          tier: product.tier,
        },
        quantity,
        subtotal: product.price * quantity,
      },
    })
  );
});

// UPDATE ITEM QUANTITY IN CART
export const updateCartItem = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { productId, quantity } = req.body;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    if (quantity < 1) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Quantity must be at least 1", null));
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Cart not found", null));
    }

    const itemIndex = cart.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Item not found in cart", null));
    }

    const product = (await Product.findById(productId)) as IProduct | null;
    if (!product) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Product not found", null));
    }

    if (product.stockStatus === "out_of_stock") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(createResponse("Product is currently out of stock", null));
    }

    if (product.stockQuantity < quantity) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          createResponse(
            `Only ${product.stockQuantity} items available in stock`,
            null
          )
        );
    }

    cart.products[itemIndex].quantity = quantity;

    await recalculateCartTotal(cart);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: "products.productId",
      select: "name price imageUrl category pharmacyId tier",
      populate: {
        path: "pharmacyId",
        select: "name location",
      },
    });

    res
      .status(StatusCodes.OK)
      .json(createResponse("Cart item updated successfully", populatedCart));
  }
);

// REMOVE ITEM FROM CART
export const removeFromCart = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { productId } = req.params;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Cart not found", null));
    }

    const itemIndex = cart.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Item not found in cart", null));
    }

    cart.products.splice(itemIndex, 1);

    await recalculateCartTotal(cart);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: "products.productId",
      select: "name price imageUrl category pharmacyId tier",
      populate: {
        path: "pharmacyId",
        select: "name location",
      },
    });

    res
      .status(StatusCodes.OK)
      .json(
        createResponse("Item removed from cart successfully", populatedCart)
      );
  }
);

// CLEAR ENTIRE CART
export const clearCart = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(createResponse("Cart not found", null));
  }

  cart.products = [];
  cart.totalPrice = 0;
  await cart.save();

  res.status(StatusCodes.OK).json(
    createResponse("Cart cleared successfully", {
      cart,
      itemCount: 0,
      totalPrice: 0,
    })
  );
});

// GET CART SUMMARY
export const getCartSummary = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const cart = await Cart.findOne({ userId })
      .populate("products.productId", "name price pharmacyId tier")
      .populate({
        path: "products.productId",
        populate: {
          path: "pharmacyId",
          select: "name location",
        },
      });

    if (!cart) {
      return res.status(StatusCodes.OK).json(
        createResponse("Cart summary retrieved successfully", {
          itemCount: 0,
          totalPrice: 0,
          pharmacies: [],
          estimatedTotal: 0,
        })
      );
    }

    const pharmacyGroups = new Map();
    let totalPrice = 0;

    cart.products.forEach((item) => {
      const product = item.productId as any;
      const pharmacy = product.pharmacyId;
      const pharmacyId = pharmacy._id.toString();

      if (!pharmacyGroups.has(pharmacyId)) {
        pharmacyGroups.set(pharmacyId, {
          pharmacy: {
            id: pharmacy._id,
            name: pharmacy.name,
            location: pharmacy.location,
          },
          items: [],
          subtotal: 0,
        });
      }

      const group = pharmacyGroups.get(pharmacyId);
      const itemTotal = product.price * item.quantity;

      group.items.push({
        product: {
          id: product._id,
          name: product.name,
          price: product.price,
          tier: product.tier,
        },
        quantity: item.quantity,
        subtotal: itemTotal,
      });

      group.subtotal += itemTotal;
      totalPrice += itemTotal;
    });

    const pharmacies = Array.from(pharmacyGroups.values());

    res.status(StatusCodes.OK).json(
      createResponse("Cart summary retrieved successfully", {
        itemCount: cart.products.length,
        totalPrice,
        pharmacies,
        estimatedTotal: totalPrice,
      })
    );
  }
);

// MOVE ITEM TO FAVORITES
export const moveToFavorites = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { productId } = req.params;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(createResponse("Authentication required", null));
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Cart not found", null));
    }

    const itemIndex = cart.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(createResponse("Item not found in cart", null));
    }

    cart.products.splice(itemIndex, 1);
    await recalculateCartTotal(cart);
    await cart.save();

    await User.findByIdAndUpdate(userId, {
      $addToSet: { favouriteProducts: productId },
    });

    res
      .status(StatusCodes.OK)
      .json(createResponse("Item moved to favorites successfully", null));
  }
);

// SYNC CART (for when user logs in from different device)
export const syncCart = asyncWrapper(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { localCartItems } = req.body;

  if (!userId) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(createResponse("Authentication required", null));
  }

  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({
      userId,
      products: [],
      totalPrice: 0,
    });
  }

  if (localCartItems && Array.isArray(localCartItems)) {
    for (const localItem of localCartItems) {
      const { productId, quantity } = localItem;

      const product = (await Product.findById(productId)) as IProduct | null;
      if (!product || product.stockStatus === "out_of_stock") continue;

      const existingIndex = cart.products.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingIndex > -1) {
        cart.products[existingIndex].quantity = Math.max(
          cart.products[existingIndex].quantity,
          Math.min(quantity, product.stockQuantity)
        );
      } else {
        cart.products.push({
          productId,
          quantity: Math.min(quantity, product.stockQuantity),
        });
      }
    }
  }

  await recalculateCartTotal(cart);
  await cart.save();

  const populatedCart = await Cart.findById(cart._id).populate({
    path: "products.productId",
    select: "name price imageUrl category pharmacyId tier",
    populate: {
      path: "pharmacyId",
      select: "name location",
    },
  });

  res
    .status(StatusCodes.OK)
    .json(createResponse("Cart synced successfully", populatedCart));
});
