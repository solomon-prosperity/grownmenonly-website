export interface DiscountableProduct {
  price: number;
  discount_active: boolean;
  discount_type: "percentage" | "fixed";
  discount_value: number;
}

export function calculateFinalPrice(product: DiscountableProduct): number {
  const price = Number(product.price) || 0;
  if (!product.discount_active) {
    return price;
  }

  let finalPrice = price;
  const discountValue = Number(product.discount_value) || 0;

  if (product.discount_type === "percentage") {
    finalPrice = price * (1 - discountValue / 100);
  } else if (product.discount_type === "fixed") {
    finalPrice = price - discountValue;
  }

  // Ensure price is never less than 0
  return Math.max(0, finalPrice);
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(price);
}
