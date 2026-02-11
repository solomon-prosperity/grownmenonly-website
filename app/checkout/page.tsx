"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useCartContext } from "@/components/CartProvider";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useBranding } from "@/components/BrandingProvider";
import { supabase } from "@/lib/supabaseClient";

/**
 * GROWN MEN ONLY - Premium Checkout Page
 * Handles order reservation, inventory locking, and Paystack redirection.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const { cart, getCartTotal, isLoaded, clearCart } = useCartContext();
  const { logoUrl } = useBranding();

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    phone: "",
    address: "",
  });

  // Checkout State
  const [status, setStatus] = useState<
    "idle" | "submitting" | "ready" | "error" | "expired"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Ref to prevent double submission (state updates can be async)
  const isSubmittingRef = useRef(false);

  // Reset ref when status changes to allow retry
  useEffect(() => {
    if (status === "idle" || status === "error") {
      isSubmittingRef.current = false;
    }
  }, [status]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("GMO_CHECKOUT_STATE");
    if (savedState) {
      try {
        const {
          paymentUrl,
          expiresAt,
          formData: savedFormData,
        } = JSON.parse(savedState);

        // Check if expired
        if (new Date(expiresAt) > new Date()) {
          setPaymentUrl(paymentUrl);
          setExpiresAt(expiresAt);
          if (savedFormData) setFormData(savedFormData);
          setStatus("ready");
        } else {
          localStorage.removeItem("GMO_CHECKOUT_STATE");
        }
      } catch (e) {
        console.error("Failed to parse saved checkout state", e);
        localStorage.removeItem("GMO_CHECKOUT_STATE");
      }
    }
  }, []);

  const clearCheckoutState = () => {
    localStorage.removeItem("GMO_CHECKOUT_STATE");
    setStatus("idle");
    setPaymentUrl(null);
    setExpiresAt(null);
    setTimeLeft(null);
  };

  // Deriving Cart Items for API
  const cartItemsForApi = useMemo(() => {
    return cart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
    }));
  }, [cart]);

  // Handle Input Changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Countdown Timer Logic
  useEffect(() => {
    if (!expiresAt || status !== "ready") return;

    const expiryTime = new Date(expiresAt).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        setStatus("expired");
        localStorage.removeItem("GMO_CHECKOUT_STATE");
      } else {
        setTimeLeft(Math.floor(distance / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  // Format Time Left (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Create Order & Reserve Stock
  const handleInitializeCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Prevent double submission
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setStatus("submitting");
    setError(null);

    try {
      console.log(
        "Cart items:",
        cartItemsForApi,
        formData.email,
        formData.fullName,
        formData.phone,
        formData.address,
      );
      const { data: result, error: funcError } =
        await supabase.functions.invoke("checkout", {
          body: {
            email: formData.email,
            customer_name: formData.fullName,
            phone: formData.phone,
            address: formData.address,
            items: cartItemsForApi,
          },
        });

      if (funcError) {
        console.error("Function Error Object:", funcError);
        let detailedMessage = funcError.message;

        // If it's an HTTP error from Supabase, the body might contain more details
        if ((funcError as any).context) {
          try {
            const body = await (funcError as any).context.json();
            if (body.error) detailedMessage = body.error;
          } catch (e) {
            console.error("Failed to parse error body", e);
          }
        }
        throw new Error(detailedMessage);
      }

      if (!result || !result.url) {
        throw new Error("Invalid response: Payment URL missing");
      }

      setPaymentUrl(result.url);
      setExpiresAt(result.expires_at);
      setStatus("ready");

      // Save state
      localStorage.setItem(
        "GMO_CHECKOUT_STATE",
        JSON.stringify({
          paymentUrl: result.url,
          expiresAt: result.expires_at,
          formData: {
            email: formData.email,
            fullName: formData.fullName,
            phone: formData.phone,
            address: formData.address,
          },
        }),
      );
    } catch (err: any) {
      console.error("Checkout error:", err);
      // More specific error messages
      const errorMessage =
        err.message ||
        (typeof err === "string" ? err : "Failed to initialize checkout");
      setError(errorMessage);
      setStatus("error");
      isSubmittingRef.current = false;
    }
  };
  // const handleInitializeCheckout = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (cart.length === 0) return;

  //   setStatus("submitting");
  //   setError(null);

  //   try {
  //     const response = await fetch(
  //       `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/checkout-v2`,
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           email: formData.email,
  //           customer_name: formData.fullName,
  //           phone: formData.phone,
  //           address: formData.address,
  //           items: cartItemsForApi,
  //         }),
  //       }
  //     );

  //     const result = await response.json();

  //     if (!response.ok) {
  //       throw new Error(result.error || "Failed to initialize checkout");
  //     }

  //     if (!result.url) {
  //       throw new Error("Payment URL missing from response");
  //     }

  //     setPaymentUrl(result.url);
  //     setExpiresAt(result.expires_at);
  //     setStatus("ready");
  //   } catch (err: any) {
  //     console.error("Checkout error:", err);
  //     setError(err.message || "Failed to initialize checkout");
  //     setStatus("error");
  //   }
  // };

  const handleRedirectToPaystack = () => {
    if (paymentUrl) {
      window.location.href = paymentUrl;
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-charcoal-900 text-white pt-24 pb-12 px-4 shadow-inner">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Side: Delivery Details */}
        <div className="space-y-8">
          <div>
            <div className="mb-6">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="GROWN MEN ONLY"
                  width={160}
                  height={48}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <span className="text-xl font-black uppercase tracking-tighter text-white">
                  Grown Men Only
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight uppercase mb-2">
              Checkout
            </h1>
            <p className="text-gray-400">
              Complete your details to secure your items.
            </p>
          </div>

          <form
            onSubmit={handleInitializeCheckout}
            className="space-y-6 bg-charcoal-800 p-6 rounded-lg border border-charcoal-700"
          >
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded text-sm mb-4">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Full Name
                </label>
                <input
                  required
                  name="fullName"
                  disabled={status === "ready" || status === "submitting"}
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full bg-charcoal-900 border border-charcoal-700 p-3 rounded focus:border-wood-500 outline-none transition-colors"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Email
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  disabled={status === "ready" || status === "submitting"}
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-charcoal-900 border border-charcoal-700 p-3 rounded focus:border-wood-500 outline-none transition-colors"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Phone Number
              </label>
              <input
                required
                name="phone"
                disabled={status === "ready" || status === "submitting"}
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full bg-charcoal-900 border border-charcoal-700 p-3 rounded focus:border-wood-500 outline-none transition-colors"
                placeholder="+234 ..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Delivery Address
              </label>
              <textarea
                required
                name="address"
                disabled={status === "ready" || status === "submitting"}
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-charcoal-900 border border-charcoal-700 p-3 rounded focus:border-wood-500 outline-none transition-colors resize-none"
                placeholder="Enter your full street address, city, and state"
              />
            </div>

            {status === "idle" || status === "error" ? (
              <button
                type="submit"
                disabled={cart.length === 0}
                className="w-full bg-wood-600 hover:bg-wood-500 text-white font-bold py-4 rounded transition-all uppercase tracking-widest disabled:opacity-50"
              >
                Secure Inventory & Pay
              </button>
            ) : null}

            <div className="flex items-start gap-4 p-4 bg-wood-500/10 rounded border border-wood-500/20">
              <div className="w-5 h-5 flex-shrink-0 text-wood-500 mt-0.5">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed uppercase tracking-widest font-medium">
                Delivery fee is not included. Our team will contact you after
                payment to confirm delivery cost and dispatch details, so please
                ensure you provide a valid phone number and email address.
              </p>
            </div>

            {status === "ready" && timeLeft !== null && (
              <div className="space-y-4 pt-4 border-t border-charcoal-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 uppercase tracking-wider">
                    Inventory Reserved For:
                  </span>
                  <span
                    className={`font-mono font-bold text-lg ${timeLeft < 60 ? "text-red-500 animate-pulse" : "text-wood-500"}`}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="w-full bg-charcoal-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${timeLeft < 60 ? "bg-red-500" : "bg-wood-500"}`}
                    style={{ width: `${(timeLeft / 900) * 100}%` }}
                  />
                </div>
                <button
                  onClick={handleRedirectToPaystack}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded transition-all uppercase tracking-widest"
                >
                  Pay with Paystack
                </button>
                <p className="text-[10px] text-center text-gray-500 uppercase tracking-tighter italic">
                  * Clicking will redirect you to Paystack&apos;s secure portal
                </p>
              </div>
            )}

            {status === "expired" && (
              <div className="pt-4 border-t border-charcoal-700 text-center">
                <p className="text-red-500 font-bold mb-4 uppercase tracking-widest">
                  Payment Window Expired
                </p>
                <button
                  onClick={clearCheckoutState}
                  className="text-sm text-wood-500 hover:text-wood-400 underline uppercase tracking-widest"
                >
                  Start Over
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Side: Order Summary */}
        <div className="bg-charcoal-800/50 p-8 rounded-lg border border-charcoal-700 h-fit sticky top-28">
          <h2 className="text-xl font-bold uppercase tracking-tight mb-8">
            Order Summary
          </h2>

          <div className="space-y-4 mb-8">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center py-2 border-b border-charcoal-700/50 pb-4"
              >
                <div className="flex gap-4 items-center">
                  <div className="bg-charcoal-900 w-12 h-12 rounded flex items-center justify-center text-xs font-bold text-wood-500">
                    {item.quantity}x
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-gray-500 text-xs tracking-wider">
                      ₦{item.price.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-sm">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-8">
            <div className="flex justify-between text-gray-400 text-sm">
              <span>Subtotal</span>
              <span>₦{getCartTotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400 text-sm">
              <span>Shipping</span>
              <span className="text-wood-500 uppercase text-xs font-bold tracking-widest">
                Calculated after purchase
              </span>
            </div>
            <div className="flex justify-between text-white text-xl font-bold pt-4 border-t border-charcoal-700">
              <span>Total</span>
              <span>₦{getCartTotal().toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-charcoal-900/50 rounded border border-charcoal-700/50">
            <div className="w-10 h-10 flex-shrink-0">
              {/* Secure Lock Icon Placeholder or SVG */}
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="text-wood-500 w-full h-full"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div className="text-[10px] text-gray-400 uppercase leading-relaxed tracking-widest">
              Secure Checkout Powered by{" "}
              <span className="text-white font-bold">Paystack</span>. Your
              inventory is reserved once you click prepare checkout.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
