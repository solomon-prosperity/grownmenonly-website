"use client";

import Link from "next/link";
import Image from "next/image";
import { useBranding } from "@/components/BrandingProvider";

export default function Footer() {
  const { logoUrl } = useBranding();

  return (
    <footer className="bg-charcoal-900 border-t border-charcoal-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <div className="mb-6">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="GROWN MEN ONLY"
                  width={200}
                  height={60}
                  className="h-14 sm:h-16 w-auto object-contain"
                />
              ) : (
                <span className="text-2xl font-black uppercase tracking-tighter text-white">
                  Grown Men Only
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-md">
              Premium beard grooming products crafted for men who take pride in
              their appearance. Quality, confidence, and masculinity in every
              bottle.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 uppercase tracking-wider text-sm">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/shop"
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  Shop
                </Link>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/grown_men_only"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/2347040885337"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  Whatsapp
                </a>
              </li>
              <li>
                <a
                  href="https://www.tiktok.com/@grown_men_only"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  Tiktok
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/share/18BQh2TN5r/?mibextid=wwXIfr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@grownmenonly.com"
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-charcoal-700">
          <p className="text-gray-500 text-xs sm:text-sm text-center">
            © {new Date().getFullYear()} Grown Men Only. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
