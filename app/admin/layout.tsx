"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useBranding } from "@/components/BrandingProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let authListener: any;

    const setupAuth = async () => {
      // 1. Check initial session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (pathname !== "/admin/login") {
          router.push("/admin/login");
        } else {
          setLoading(false);
        }
      } else {
        await checkRole(session.user.id);
      }

      // 2. Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT") {
          setIsAdmin(false);
          if (pathname !== "/admin/login") {
            router.push("/admin/login");
          }
        } else if (session) {
          await checkRole(session.user.id);
        }
      });
      authListener = subscription;
    };

    const checkRole = async (userId: string) => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          // If we can't find the profile yet, don't immediately kick them out
          // unless we're sure they are authenticated
          return;
        }

        if (profile?.role === "admin") {
          setIsAdmin(true);
          if (pathname === "/admin/login") {
            router.push("/admin/dashboard");
          }
        } else {
          // Explicitly NOT an admin
          setIsAdmin(false);
          await supabase.auth.signOut();
          router.push("/admin/login");
        }
      } catch (err) {
        console.error("Role check error:", err);
      } finally {
        setLoading(false);
      }
    };

    setupAuth();

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, [pathname, router]);

  // Handle logout
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard" },
    { name: "Products", href: "/admin/products" },
    { name: "Inventory", href: "/admin/inventory" },
    { name: "Orders", href: "/admin/orders" },
    { name: "Transactions", href: "/admin/transactions" },
    { name: "Settings", href: "/admin/settings" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wood-500"></div>
      </div>
    );
  }

  // If on login page, don't show the layout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-charcoal-900 text-white flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-charcoal-700">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-sm text-gray-400 mt-1">Grown Men Only</p>
        </div>

        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-4 py-3 rounded transition-colors ${
                    pathname === item.href
                      ? "bg-wood-500 text-white"
                      : "text-gray-300 hover:bg-charcoal-800"
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-charcoal-700 space-y-2">
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-3 text-red-400 hover:text-red-300 transition-colors text-sm uppercase tracking-wide"
          >
            Sign Out
          </button>
          <Link
            href="/"
            className="block px-4 py-3 text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back to Store
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {navItems.find((item) => item.href === pathname)?.name || "Admin"}
          </h2>
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
