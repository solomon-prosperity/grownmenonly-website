"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartContext } from "@/components/CartProvider";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  slug: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCartContext();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
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
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 group-hover:text-wood-500 transition-colors">
          {product.name}
        </h3>
        <p className="text-xl font-bold text-wood-500 mb-4">
          {formatPrice(product.price)}
        </p>
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full bg-wood-500 hover:bg-wood-600 text-white font-semibold py-3 px-4 transition-colors duration-300"
        >
          Add to Cart
        </button>
      </div>
    </Link>
  );
}
