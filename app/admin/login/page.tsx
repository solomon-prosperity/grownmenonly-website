"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useBranding } from "@/components/BrandingProvider";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logoUrl } = useBranding();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      // After successful login, check role from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData.role !== "admin") {
        // Log out immediately if not an admin
        await supabase.auth.signOut();
        throw new Error("Access denied. Admin role required.");
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Invalid credentials");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-900 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-charcoal-800 p-8 rounded-lg shadow-xl border border-charcoal-700">
        <div className="flex flex-col items-center mb-10 text-center">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="GROWN MEN ONLY"
              width={200}
              height={56}
              className="h-12 w-auto mb-6 object-contain"
              priority
            />
          ) : (
            <span className="text-3xl font-black uppercase tracking-tighter text-white mb-6">
              Grown Men Only
            </span>
          )}
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Admin Login
          </h1>
          <p className="text-gray-400 mt-2">
            Enter your credentials to access the panel
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-charcoal-900 border border-charcoal-700 text-white px-4 py-3 rounded focus:outline-none focus:border-wood-500 transition-colors"
              placeholder="admin@grownmenonly.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-charcoal-900 border border-charcoal-700 text-white px-4 py-3 rounded focus:outline-none focus:border-wood-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wood-500 hover:bg-wood-600 text-white font-bold py-4 rounded transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <a
            href="/"
            className="hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <span>←</span> Back to Store
          </a>
        </div>
      </div>

      <p className="mt-8 text-gray-600 text-xs uppercase tracking-[0.2em]">
        Authorized Access Only
      </p>
    </div>
  );
}
