"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type DatePreset = "today" | "this_month" | "this_year" | "custom";

interface DashboardStats {
  revenue: number;
  totalOrders: number;
  orderBreakdown: {
    paid: number;
    pending: number;
    abandoned: number;
  };
  paymentHealth: {
    success: number;
    failed: number;
    rate: number;
  };
  lowStockItems: Array<{
    id: string;
    name: string;
    stock: number;
  }>;
}

export default function AdminDashboard() {
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let start: Date;
      let end = new Date();

      if (datePreset === "today") {
        start = new Date();
        start.setHours(0, 0, 0, 0);
      } else if (datePreset === "this_month") {
        start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      } else if (datePreset === "this_year") {
        start = new Date();
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
      } else {
        start = startDate ? new Date(startDate) : new Date(0);
        if (endDate) {
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        }
      }

      const isoStart = start.toISOString();
      const isoEnd = end.toISOString();

      // 1. Revenue & Orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total, status, created_at")
        .gte("created_at", isoStart)
        .lte("created_at", isoEnd);

      if (ordersError) throw ordersError;

      // 2. Transactions (Payment Health)
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("status, created_at")
        .gte("created_at", isoStart)
        .lte("created_at", isoEnd)
        .neq("status", "pending");

      if (txError) throw txError;

      // 3. Low Stock Items (Not filtered by date)
      const { data: lowStock, error: stockError } = await supabase
        .from("products")
        .select("id, name, stock")
        .lte("stock", 5)
        .order("stock", { ascending: true });

      if (stockError) throw stockError;

      // Calculations
      const revenue = orders
        .filter((o) => ["paid", "completed"].includes(o.status))
        .reduce((sum, o) => sum + Number(o.total), 0);

      const breakdown = {
        paid: orders.filter((o) =>
          ["paid", "completed", "shipped", "delivered"].includes(o.status),
        ).length,
        pending: orders.filter((o) => o.status === "pending").length,
        abandoned: orders.filter((o) => o.status === "abandoned").length,
      };

      const txSuccess = transactions.filter(
        (t) => t.status === "success",
      ).length;
      const txFailed = transactions.filter((t) => t.status === "failed").length;
      const healthRate =
        txSuccess + txFailed > 0
          ? (txSuccess / (txSuccess + txFailed)) * 100
          : 0;

      setStats({
        revenue,
        totalOrders: orders.length,
        orderBreakdown: breakdown,
        paymentHealth: {
          success: txSuccess,
          failed: txFailed,
          rate: healthRate,
        },
        lowStockItems: lowStock || [],
      });
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }, [datePreset, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const MetricCard = ({ title, value, subValue, icon }: any) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
        <div className="text-wood-500">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-2">{subValue}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(["today", "this_month", "this_year", "custom"] as const).map(
            (preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors uppercase tracking-wide ${
                  datePreset === preset
                    ? "bg-wood-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {preset.replace("_", " ")}
              </button>
            ),
          )}
        </div>

        {datePreset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2 focus:ring-wood-500 focus:border-wood-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2 focus:ring-wood-500 focus:border-wood-500"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center justify-between">
          <p>{error}</p>
          <button onClick={fetchStats} className="text-sm font-bold underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Revenue"
              value={`₦${stats.revenue.toLocaleString()}`}
              subValue="From paid/completed orders"
              icon={<RevenueIcon />}
            />
            <MetricCard
              title="Total Orders"
              value={stats.totalOrders}
              subValue={`${stats.orderBreakdown.paid} paid • ${stats.orderBreakdown.pending} pending`}
              icon={<OrderIcon />}
            />
            <MetricCard
              title="Payment Health"
              value={`${stats.paymentHealth.rate.toFixed(1)}%`}
              subValue={`${stats.paymentHealth.success} success / ${stats.paymentHealth.failed} failed`}
              icon={<HealthIcon />}
            />
            <MetricCard
              title="Abandoned Cart"
              value={stats.orderBreakdown.abandoned}
              subValue="Orders with no payment attempt"
              icon={<AbandonedIcon />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Inventory Alerts */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  Inventory Alerts
                </h3>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {stats.lowStockItems.length} Low Stock
                </span>
              </div>
              <div className="flex-1 overflow-auto max-h-[400px]">
                {stats.lowStockItems.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {stats.lowStockItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {item.name}
                        </span>
                        <div className="text-right">
                          <span
                            className={`text-sm font-bold ${item.stock <= 0 ? "text-red-500" : "text-amber-600"}`}
                          >
                            {item.stock} left
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-400 text-sm uppercase tracking-widest">
                      All stock levels healthy
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 uppercase tracking-tight">
                  Order Distribution
                </h3>
              </div>
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <StatusStat
                  label="Paid"
                  count={stats.orderBreakdown.paid}
                  color="bg-green-500"
                />
                <StatusStat
                  label="Pending"
                  count={stats.orderBreakdown.pending}
                  color="bg-blue-500"
                />
                <StatusStat
                  label="Abandoned"
                  count={stats.orderBreakdown.abandoned}
                  color="bg-gray-400"
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const StatusStat = ({ label, count, color }: any) => (
  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
    <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-2`}></div>
    <p className="text-2xl font-black text-charcoal-900">{count}</p>
    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">
      {label}
    </p>
  </div>
);

// Icons
const RevenueIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const OrderIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
    />
  </svg>
);

const HealthIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const AbandonedIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
