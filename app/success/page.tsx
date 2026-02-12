"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useCartContext } from "@/components/CartProvider";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useBranding } from "@/components/BrandingProvider";
import { supabase } from "@/lib/supabaseClient";

/**
 * GROWN MEN ONLY - Success Confirmation Page
 * Automatically clears the cart on success and handles payment verification.
 */
function SuccessContent() {
  const { clearCart } = useCartContext();
  const { logoUrl } = useBranding();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<
    "verifying" | "success" | "pending" | "failed"
  >("verifying");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reference = searchParams.get("tx_ref");

  const verifyPayment = useCallback(async () => {
    if (!reference) {
      setStatus("failed");
      setErrorMsg("Missing transaction reference.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "verify-payment",
        {
          body: { reference },
        },
      );

      if (error) throw error;

      if (!data) {
        throw new Error("No data returned from verification service.");
      }

      if (data.status === "success") {
        setStatus("success");
        clearCart();
        localStorage.removeItem("GMO_CHECKOUT_STATE");
      } else if (data.status === "pending") {
        setStatus("pending");
      } else {
        setStatus("failed");
        localStorage.removeItem("GMO_CHECKOUT_STATE");
        setErrorMsg(data.message || "Your payment could not be confirmed.");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      try {
        localStorage.removeItem("GMO_CHECKOUT_STATE");
      } catch (e) {
        // ignore storage errors
      }
      setStatus("failed");
      setErrorMsg(
        err.message || "An error occurred while verifying your payment.",
      );
    }
  }, [reference, clearCart]);

  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-wood-500"></div>
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-bold uppercase tracking-widest text-white">
            Verifying Payment
          </h2>
          <p className="text-gray-400 text-sm">
            Securing your order details, please wait...
          </p>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="max-w-md w-full text-center space-y-8 bg-charcoal-800 p-10 rounded-lg border border-charcoal-700 shadow-2xl">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-wood-500/10 rounded-full flex items-center justify-center border-2 border-wood-500 animate-pulse">
            <svg
              className="w-10 h-10 text-wood-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white">
            Payment Pending
          </h1>
          <p className="text-gray-400">
            Your payment is currently being processed by the bank. We&apos;ll
            update your order status as soon as it&apos;s confirmed.
          </p>
        </div>
        <div className="pt-6">
          <button
            onClick={() => window.location.reload()}
            className="block w-full bg-charcoal-700 hover:bg-charcoal-600 text-white font-bold py-4 rounded transition-all uppercase tracking-widest mb-4"
          >
            Check Again
          </button>
          <Link
            href="/shop"
            className="text-wood-500 hover:text-wood-400 text-sm uppercase tracking-widest font-bold"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="max-w-md w-full text-center space-y-8 bg-charcoal-800 p-10 rounded-lg border border-red-500/20 shadow-2xl">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white">
            Payment Failed
          </h1>
          <p className="text-gray-400">
            {errorMsg ||
              "We couldn&apos;t confirm your payment. Please try again or contact support if the issue persists."}
          </p>
        </div>
        <div className="pt-6 space-y-4">
          <Link
            href="/checkout"
            className="block w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded transition-all uppercase tracking-widest shadow-lg"
          >
            Try Again
          </Link>
          <Link
            href="/shop"
            className="block text-gray-500 hover:text-white text-sm uppercase tracking-widest font-bold"
          >
            Cancel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full text-center space-y-8 bg-charcoal-800 p-10 rounded-lg border border-charcoal-700 shadow-2xl">
      <div className="flex flex-col items-center gap-6">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="GROWN MEN ONLY"
            width={200}
            height={60}
            className="h-12 w-auto object-contain"
          />
        ) : (
          <span className="text-2xl font-black uppercase tracking-tighter text-white">
            Grown Men Only
          </span>
        )}

        <div className="w-20 h-20 bg-wood-500/20 rounded-full flex items-center justify-center border-2 border-wood-500">
          <svg
            className="w-10 h-10 text-wood-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold uppercase tracking-tight text-white">
          Thank you for your order.
        </h1>
        <p className="text-gray-400 text-lg">
          Our team will contact you shortly to confirm delivery fee and delivery
          timeline.
        </p>
        {reference && (
          <div className="pt-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
              Transaction Reference
            </p>
            <p className="text-xs font-mono text-wood-500 break-all bg-charcoal-900/50 p-2 rounded">
              {reference}
            </p>
          </div>
        )}
      </div>

      <div className="pt-6">
        <Link
          href="/shop"
          className="block w-full bg-wood-600 hover:bg-wood-500 text-white font-bold py-4 rounded transition-all uppercase tracking-widest shadow-lg"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wood-500"></div>
            <p className="text-gray-500 uppercase tracking-widest text-xs">
              Loading...
            </p>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  );
}
