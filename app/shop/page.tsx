"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabaseClient";

type Category = "all" | "single" | "kit";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  slug: string;
  category: "single" | "kit";
  description?: string;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (err: any) {
        console.error("Error fetching products:", err);
        setError(err.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const filteredProducts =
    activeCategory === "all"
      ? products
      : products.filter((product) => product.category === activeCategory);

  return (
    <main className="min-h-screen bg-charcoal-900 py-12 px-4 pt-28 sm:pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Shop</h1>
          <p className="text-gray-400 text-lg">
            Premium beard care products for the modern gentleman
          </p>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-6 py-3 font-semibold uppercase tracking-wider text-sm transition-all ${
                activeCategory === "all"
                  ? "bg-wood-500 text-white"
                  : "bg-charcoal-800 text-gray-400 hover:bg-charcoal-700 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveCategory("single")}
              className={`px-6 py-3 font-semibold uppercase tracking-wider text-sm transition-all ${
                activeCategory === "single"
                  ? "bg-wood-500 text-white"
                  : "bg-charcoal-800 text-gray-400 hover:bg-charcoal-700 hover:text-white"
              }`}
            >
              Single Products
            </button>
            <button
              onClick={() => setActiveCategory("kit")}
              className={`px-6 py-3 font-semibold uppercase tracking-wider text-sm transition-all ${
                activeCategory === "kit"
                  ? "bg-wood-500 text-white"
                  : "bg-charcoal-800 text-gray-400 hover:bg-charcoal-700 hover:text-white"
              }`}
            >
              Kits
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wood-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-wood-500 hover:bg-wood-600 text-white px-6 py-2"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No products found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
