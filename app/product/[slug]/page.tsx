"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useCartContext } from "@/components/CartProvider";
import { useToast } from "@/components/ToastProvider";
import { supabase } from "@/lib/supabaseClient";
import { calculateFinalPrice, formatPrice } from "@/lib/priceUtils";

type Category = "single" | "kit";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  slug: string;
  category: Category;
  description: string;
  stock: number;
  discount_active: boolean;
  discount_type: "percentage" | "fixed";
  discount_value: number;
}

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { addToCart, cart, updateQuantity, removeFromCart } = useCartContext();
  const { addToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cartItem = cart.find((item) => item.id === product?.id);
  const quantityInCart = cartItem?.quantity || 0;

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("slug", params.slug)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (err: any) {
        console.error("Error fetching product:", err);
        setError(err.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [params.slug]);

  const handleAddToCart = () => {
    if (!product || product.stock <= 0) return;

    const finalPrice = calculateFinalPrice(product);
    addToCart({
      id: product.id,
      name: product.name,
      price: finalPrice,
      slug: product.slug,
    });
    addToast("Added to cart", "success");
  };

  const handleUpdateQuantity = (newQuantity: number) => {
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(product.id);
      addToast("Removed from cart", "info");
      return;
    }

    if (newQuantity > product.stock) {
      addToast("Cannot add more than available stock", "error");
      return;
    }

    updateQuantity(product.id, newQuantity);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-charcoal-900 py-12 px-4 pt-28 sm:pt-32">
        <div className="max-w-7xl mx-auto flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wood-500"></div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-charcoal-900 py-12 px-4 pt-28 sm:pt-32">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            {error ? "Error" : "Product Not Found"}
          </h1>
          <p className="text-gray-400 mb-8">
            {error || "The product you&apos;re looking for doesn&apos;t exist."}
          </p>
          <a
            href="/shop"
            className="inline-block bg-wood-500 hover:bg-wood-600 text-white font-semibold px-8 py-3 transition-colors"
          >
            Back to Shop
          </a>
        </div>
      </main>
    );
  }

  const finalPrice = calculateFinalPrice(product);

  return (
    <main className="min-h-screen bg-charcoal-900 py-12 px-4 pt-28 sm:pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-charcoal-800 aspect-square flex items-center justify-center relative overflow-hidden">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-gray-600 text-lg">Product Image</span>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-4">
              <span className="inline-block bg-charcoal-800 text-gray-400 text-xs uppercase tracking-wider px-3 py-1 font-semibold">
                {product.category === "single" ? "Single Product" : "Kit"}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-4 mb-6">
              <p className="text-3xl font-bold text-wood-500">
                {formatPrice(finalPrice)}
              </p>
              {product.discount_active &&
                finalPrice < Number(product.price) && (
                  <p className="text-xl text-gray-500 line-through">
                    {formatPrice(Number(product.price))}
                  </p>
                )}
              {product.discount_active && (
                <span className="bg-wood-500 text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest">
                  SALE
                </span>
              )}
            </div>

            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              {product.description}
            </p>

            {quantityInCart > 0 ? (
              <div className="flex items-center justify-between bg-charcoal-800 border border-charcoal-700 rounded-lg p-2 w-full lg:w-48 mb-8">
                <button
                  onClick={() => handleUpdateQuantity(quantityInCart - 1)}
                  className="w-12 h-12 flex items-center justify-center text-white hover:text-wood-500 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>
                <span className="text-white text-xl font-bold">
                  {quantityInCart}
                </span>
                <button
                  onClick={() => handleUpdateQuantity(quantityInCart + 1)}
                  className="w-12 h-12 flex items-center justify-center text-white hover:text-wood-500 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className={`px-12 py-4 text-lg transition-colors w-full lg:w-auto font-semibold mb-8 ${
                  product.stock <= 0
                    ? "bg-charcoal-800 text-gray-500 cursor-not-allowed"
                    : "bg-wood-500 hover:bg-wood-600 text-white"
                }`}
              >
                {product.stock <= 0 ? "SOLD OUT" : "Add to Cart"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
