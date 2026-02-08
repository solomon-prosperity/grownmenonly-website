"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("Grown Men Only");
  const [tagLine, setTagLine] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value");

      if (error) throw error;

      if (data) {
        data.forEach((setting: { key: string; value: string }) => {
          if (setting.key === "logo_url") setLogoUrl(setting.value);
          if (setting.key === "site_name") setSiteName(setting.value);
          if (setting.key === "tag_line") setTagLine(setting.value);
          if (setting.key === "maintenance_mode")
            setMaintenanceMode(setting.value === "true");
        });
      }
    } catch (err: any) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    try {
      setSavingField(key);
      setMessage(null);

      const { error } = await supabase.from("settings").upsert({ key, value });

      if (error) throw error;

      setMessage({
        type: "success",
        text: `${key.replace("_", " ")} updated!`,
      });
      window.dispatchEvent(new Event("settingsUpdated"));
    } catch (err: any) {
      console.error(`Error saving ${key}:`, err);
      setMessage({
        type: "error",
        text: `Failed to update ${key}: ` + err.message,
      });
    } finally {
      setSavingField(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage(null);

      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(filePath);

      const { error: upsertError } = await supabase
        .from("settings")
        .upsert({ key: "logo_url", value: publicUrl });

      if (upsertError) throw upsertError;

      setLogoUrl(publicUrl);
      setMessage({ type: "success", text: "Logo updated successfully!" });
      window.dispatchEvent(new Event("settingsUpdated"));
    } catch (err: any) {
      console.error("Upload error:", err);
      setMessage({
        type: "error",
        text: "Failed to update logo: " + err.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tighter text-gray-900">
          General Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your store&apos;s branding and global configurations.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-12">
        {/* Logo Section */}
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-gray-900 uppercase tracking-widest text-sm">
              Store Logo
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              This logo will appear on your navbar, footer, and checkout pages.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Preview */}
            <div className="w-full md:w-64 h-64 bg-charcoal-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
              {loading ? (
                <div className="animate-pulse flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                </div>
              ) : logoUrl ? (
                <>
                  <img
                    src={logoUrl}
                    alt="Store Logo"
                    className="max-w-full max-h-full object-contain p-4 transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-charcoal-900/0 group-hover:bg-charcoal-900/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-white text-xs font-bold uppercase tracking-widest">
                      Current Logo
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 bg-charcoal-900 text-white w-full h-full flex items-center justify-center font-bold tracking-tighter uppercase">
                  {siteName}
                </div>
              )}
            </div>

            {/* Upload Control */}
            <div className="flex-1 space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-widest">
                  Upload New Logo
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="logo-upload"
                    className={`px-6 py-3 bg-wood-500 text-white font-bold rounded cursor-pointer hover:bg-wood-600 transition-all uppercase tracking-widest text-sm shadow-md block text-center ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {uploading ? "Uploading..." : "Choose Image"}
                  </label>
                  {uploading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-wood-500 border-t-transparent"></div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-4 leading-relaxed uppercase tracking-tighter">
                  Recommended: PNG or SVG with transparent background. <br />
                  Min size: 200x200px. Max size: 2MB.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Configuration */}
        <div className="pt-8 border-t border-gray-100 space-y-8">
          <div>
            <h3 className="font-bold text-gray-900 uppercase tracking-widest text-sm">
              Global Configuration
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              General information about your store and application state.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Site Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                Site Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-wood-500 transition-colors"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Grown Men Only"
                />
                <button
                  onClick={() => handleSaveSetting("site_name", siteName)}
                  disabled={savingField === "site_name"}
                  className="px-4 py-2 bg-charcoal-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-charcoal-800 disabled:opacity-50 transition-colors"
                >
                  {savingField === "site_name" ? "..." : "Save"}
                </button>
              </div>
            </div>

            {/* Tag Line */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                Tag Line
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-wood-500 transition-colors"
                  value={tagLine}
                  onChange={(e) => setTagLine(e.target.value)}
                  placeholder="Premium beard care..."
                />
                <button
                  onClick={() => handleSaveSetting("tag_line", tagLine)}
                  disabled={savingField === "tag_line"}
                  className="px-4 py-2 bg-charcoal-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-charcoal-800 disabled:opacity-50 transition-colors"
                >
                  {savingField === "tag_line" ? "..." : "Save"}
                </button>
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                Maintenance Mode
              </label>
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded border border-gray-200">
                <button
                  onClick={() => {
                    const newValue = !maintenanceMode;
                    setMaintenanceMode(newValue);
                    handleSaveSetting("maintenance_mode", String(newValue));
                  }}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${maintenanceMode ? "bg-red-500" : "bg-gray-300"}`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${maintenanceMode ? "translate-x-7" : "translate-x-1"}`}
                  />
                </button>
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${maintenanceMode ? "text-red-500" : "text-gray-400"}`}
                >
                  {maintenanceMode ? "Active" : "Inactive"}
                </span>
                {savingField === "maintenance_mode" && (
                  <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-tighter leading-relaxed">
                When active, a maintenance overlay will block all frontend
                interactions.
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}
          >
            {message.type === "success" ? (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
