import Product, { IProduct } from "../models/Product.model";

export const recalculateCartTotal = async (cart: any) => {
  let totalPrice = 0;

  for (const item of cart.products) {
    const product = (await Product.findById(item.productId)) as IProduct | null;
    if (
      product &&
      product.stockStatus !== "out_of_stock" &&
      product.stockQuantity >= item.quantity
    ) {
      totalPrice += product.price * item.quantity;
    }
  }

  cart.totalPrice = totalPrice;
};
