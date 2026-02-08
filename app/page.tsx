"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabaseClient";
import { useBranding } from "@/components/BrandingProvider";

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

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { siteName, tagLine } = useBranding();

  useEffect(() => {
    async function fetchFeatured() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .limit(4);

        if (error) throw error;
        setFeaturedProducts(data || []);
      } catch (err) {
        console.error("Error fetching featured products:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatured();
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-charcoal-900 via-charcoal-800 to-charcoal-900 px-4 pt-16 sm:pt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight uppercase">
            {siteName}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 font-light">
            {tagLine}
          </p>
          <Link
            href="/shop"
            className="inline-block bg-wood-500 hover:bg-wood-600 text-white font-semibold px-12 py-4 text-lg transition-all duration-300 transform hover:scale-105"
          >
            SHOP NOW
          </Link>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20 px-4 bg-charcoal-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Featured Products
          </h2>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-wood-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          <div className="text-center mt-12">
            <Link
              href="/shop"
              className="inline-block text-wood-500 hover:text-wood-600 font-semibold text-lg border-b-2 border-wood-500 hover:border-wood-600 transition-colors"
            >
              View All Products →
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Statement Section */}
      <section className="py-20 px-4 bg-charcoal-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Crafted for the Modern Gentleman
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed">
            Every product is formulated with premium natural ingredients to
            nourish, strengthen, and style your beard. No compromises. No
            gimmicks. Just results.
          </p>
        </div>
      </section>
    </main>
  );
}
