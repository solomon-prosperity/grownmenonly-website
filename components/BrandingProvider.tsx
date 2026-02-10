"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface BrandingContextType {
  logoUrl: string | null;
  siteName: string;
  tagLine: string;
  maintenanceMode: boolean;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  logoUrl: null,
  siteName: "Grown Men Only",
  tagLine: "Premium beard care for men who take grooming seriously",
  maintenanceMode: false,
  loading: true,
});

export const useBranding = () => useContext(BrandingContext);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("Grown Men Only");
  const [tagLine, setTagLine] = useState(
    "Premium beard care for men who take grooming seriously",
  );
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const fetchBranding = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value");

      if (error) throw error;

      if (data) {
        data.forEach((setting: { key: string; value: string }) => {
          if (setting.key === "logo_url") {
            setLogoUrl(setting.value);
            updateFavicon(setting.value);
          }
          if (setting.key === "site_name") {
            setSiteName(setting.value);
          }
          if (setting.key === "tag_line") setTagLine(setting.value);
          if (setting.key === "maintenance_mode")
            setMaintenanceMode(setting.value === "true");
        });
      }
    } catch (err) {
      console.error("Error fetching branding:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFavicon = (url: string) => {
    if (typeof window === "undefined") return;

    let link: HTMLLinkElement | null =
      document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    link.href = url;
  };

  useEffect(() => {
    fetchBranding();

    const handleUpdate = () => {
      fetchBranding();
    };

    window.addEventListener("settingsUpdated", handleUpdate);
    return () => window.removeEventListener("settingsUpdated", handleUpdate);
  }, [fetchBranding]);

  // Maintenance Overlay Component
  const MaintenanceOverlay = () => (
    <div className="fixed inset-0 z-[9999] bg-charcoal-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        {logoUrl ? (
          <div className="relative h-20 w-full">
            <Image
              src={logoUrl}
              alt={siteName}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 400px"
              priority
            />
          </div>
        ) : (
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
            {siteName}
          </h1>
        )}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-wood-500 uppercase tracking-widest">
            Under Maintenance
          </h2>
          <p className="text-gray-400 leading-relaxed uppercase tracking-tighter text-sm">
            We are currently updating our store to bring you the best
            experience. Please check back soon.
          </p>
        </div>
        <div className="pt-8 border-t border-charcoal-800">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">
            {tagLine}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <BrandingContext.Provider
      value={{ logoUrl, siteName, tagLine, maintenanceMode, loading }}
    >
      {maintenanceMode && !isAdmin ? <MaintenanceOverlay /> : children}
    </BrandingContext.Provider>
  );
}
