"use client";

import Link from "next/link";
import { useCartContext } from "@/components/CartProvider";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, getCartTotal } =
    useCartContext();

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-charcoal-900 py-12 px-4 pt-28 sm:pt-32">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Cart</h1>
          <p className="text-gray-400 text-lg mb-8">Your cart is empty</p>
          <Link
            href="/shop"
            className="inline-block bg-wood-500 hover:bg-wood-600 text-white font-semibold px-8 py-3 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-charcoal-900 py-12 px-4 pt-28 sm:pt-32">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-charcoal-800 border border-charcoal-700 p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-xl font-semibold hover:text-wood-500 transition-colors"
                    >
                      {item.name}
                    </Link>
                    <p className="text-gray-400 mt-1">
                      ₦{item.price.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="bg-charcoal-700 hover:bg-charcoal-600 text-white w-8 h-8 flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="bg-charcoal-700 hover:bg-charcoal-600 text-white w-8 h-8 flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-32 text-right">
                      <p className="font-bold text-lg">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-400 transition-colors ml-4"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-charcoal-800 border border-charcoal-700 p-6 sticky top-28">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>₦{getCartTotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span>Details at checkout</span>
                </div>
              </div>

              <div className="border-t border-charcoal-700 pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-wood-500">
                    ₦{getCartTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              <Link href="/checkout">
                <button className="w-full bg-wood-500 hover:bg-wood-600 text-white font-semibold py-4 text-lg transition-colors mb-4">
                  Proceed to Checkout
                </button>
              </Link>

              <Link
                href="/shop"
                className="block text-center text-gray-400 hover:text-white transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
