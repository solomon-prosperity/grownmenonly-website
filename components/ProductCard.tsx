"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartContext } from "@/components/CartProvider";
import { calculateFinalPrice, formatPrice } from "@/lib/priceUtils";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  slug: string;
  stock: number;
  discount_active: boolean;
  discount_type: "percentage" | "fixed";
  discount_value: number;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCartContext();

  const finalPrice = calculateFinalPrice(product);
  const hasDiscount = product.discount_active && finalPrice < product.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;

    addToCart({
      id: product.id,
      name: product.name,
      price: finalPrice,
      slug: product.slug,
    });
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="bg-charcoal-800 border border-charcoal-700 overflow-hidden transition-all duration-300 hover:border-wood-500 group block"
    >
      {/* Product Image */}
      <div className="aspect-square bg-charcoal-700 relative overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* SALE Badge */}
        {hasDiscount && (
          <div className="absolute top-4 left-4 bg-wood-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 z-10 shadow-lg">
            SALE
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 group-hover:text-wood-500 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mb-4">
          <p className="text-xl font-bold text-wood-500">
            {formatPrice(finalPrice)}
          </p>
          {hasDiscount && (
            <p className="text-sm text-gray-400 line-through">
              {formatPrice(product.price)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className={`w-full font-semibold py-3 px-4 transition-colors duration-300 ${
            product.stock <= 0
              ? "bg-charcoal-700 text-gray-400 cursor-not-allowed"
              : "bg-wood-500 hover:bg-wood-600 text-white"
          }`}
        >
          {product.stock <= 0 ? "Sold Out" : "Add to Cart"}
        </button>
      </div>
    </Link>
  );
}
