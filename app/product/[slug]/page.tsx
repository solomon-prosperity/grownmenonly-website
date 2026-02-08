"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useCartContext } from "@/components/CartProvider";
import { supabase } from "@/lib/supabaseClient";

type Category = "single" | "kit";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  slug: string;
  category: Category;
  description: string;
}

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { addToCart } = useCartContext();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

            <p className="text-3xl font-bold text-wood-500 mb-6">
              ₦{product.price.toLocaleString()}
            </p>

            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              {product.description}
            </p>

            <button
              onClick={() =>
                addToCart({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  slug: product.slug,
                })
              }
              className="bg-wood-500 hover:bg-wood-600 text-white font-semibold px-12 py-4 text-lg transition-colors w-full lg:w-auto"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
