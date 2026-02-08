"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useCartContext } from "@/components/CartProvider";
import { useBranding } from "@/components/BrandingProvider";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { getCartCount } = useCartContext();
  const { logoUrl } = useBranding();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-charcoal-900/95 backdrop-blur-md border-b border-charcoal-700/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link href="/" className="flex items-center">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="GROWN MEN ONLY"
                width={200}
                height={60}
                className="h-10 sm:h-12 w-auto object-contain"
                priority
              />
            ) : (
              <span className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white">
                Grown Men Only
              </span>
            )}
          </Link>

          <div className="flex items-center gap-6 sm:gap-8">
            <Link
              href="/about"
              className="text-sm sm:text-base font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-wider"
            >
              About
            </Link>
            <Link
              href="/shop"
              className="text-sm sm:text-base font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-wider"
            >
              Shop
            </Link>
            <Link
              href="/cart"
              className="text-sm sm:text-base font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-wider flex items-center gap-2"
            >
              <span>Cart</span>
              <span className="text-xs bg-wood-600 text-white px-2 py-0.5 rounded-full">
                {getCartCount()}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
