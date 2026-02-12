"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/priceUtils";

type OrderStatus =
  | "pending"
  | "paid"
  | "abandoned"
  | "inventory_issue"
  | "shipped"
  | "delivery_in_progress"
  | "delivered"
  | "completed"
  | "returned";

interface Order {
  id: string;
  email: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  delivery_fee?: number;
  status: OrderStatus;
  created_at: string;
  reserved_at: string;
  expires_at: string;
  order_items?: any[];
  transactions?: any[];
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  paid: "bg-green-500/10 text-green-500",
  abandoned: "bg-gray-500/10 text-gray-500",
  inventory_issue: "bg-red-500/10 text-red-500",
  shipped: "bg-blue-500/10 text-blue-500",
  delivery_in_progress: "bg-indigo-500/10 text-indigo-500",
  delivered: "bg-emerald-500/10 text-emerald-500",
  completed: "bg-wood-500/20 text-wood-500",
  returned: "bg-orange-500/10 text-orange-500",
};

const ITEMS_PER_PAGE = 10;

const formatDate = (
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
) => {
  return new Intl.DateTimeFormat("en-US", options).format(new Date(dateString));
};

type DatePreset = "all" | "today" | "this_month" | "this_year" | "custom";

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingFee, setUpdatingFee] = useState<string | null>(null);
  const [tempFee, setTempFee] = useState<string>("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get("id");

  // Handle direct links to an order
  useEffect(() => {
    if (orderIdFromUrl) {
      const fetchSingleOrder = async () => {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("*, order_items(*, products(name)), transactions(*)")
            .eq("id", orderIdFromUrl)
            .single();

          if (error) throw error;
          if (data) setSelectedOrder(data);
        } catch (err) {
          console.error("Error fetching linked order:", err);
        }
      };
      fetchSingleOrder();
    }
  }, [orderIdFromUrl]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("orders")
        .select("*, order_items(*, products(name)), transactions(*)", {
          count: "exact",
        });

      // Apply Status Filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply Date Filter
      const now = new Date();
      if (datePreset === "today") {
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString();
        query = query.gte("created_at", today);
      } else if (datePreset === "this_month") {
        const monthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).toISOString();
        query = query.gte("created_at", monthStart);
      } else if (datePreset === "this_year") {
        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
        query = query.gte("created_at", yearStart);
      } else if (datePreset === "custom") {
        if (startDate)
          query = query.gte("created_at", new Date(startDate).toISOString());
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query = query.lte("created_at", end.toISOString());
        }
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setOrders(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("Fetch orders error:", err);
      setError(err.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, datePreset, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on filter change
  }, [statusFilter, datePreset, startDate, endDate]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    setUpdatingStatus(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: newStatus } : null,
        );
      }
      showToast("Order status updated!", "success");
    } catch (err: any) {
      showToast("Failed to update status: " + err.message, "error");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeliveryFeeUpdate = async (orderId: string) => {
    const fee = parseFloat(tempFee);
    if (isNaN(fee) || fee < 0) {
      alert("Please enter a valid non-negative number for the delivery fee.");
      return;
    }

    setUpdatingFee(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_fee: fee })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, delivery_fee: fee } : o)),
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, delivery_fee: fee } : null,
        );
      }
      showToast("Delivery fee updated successfully!", "success");
    } catch (err: any) {
      showToast("Failed to update delivery fee: " + err.message, "error");
    } finally {
      setUpdatingFee(null);
    }
  };

  useEffect(() => {
    if (selectedOrder) {
      setTempFee((selectedOrder.delivery_fee ?? 0).toString());
    }
  }, [selectedOrder]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-8 z-[100] animate-slide-in">
          <div
            className={`rounded-lg shadow-xl p-4 min-w-[300px] border flex flex-col gap-1 ${
              toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="font-bold text-sm leading-tight">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">
            View and manage customer orders across all channels.
          </p>
          <div className="text-sm text-gray-400">
            {loading
              ? "Loading..."
              : `Showing ${orders.length} of ${totalCount} orders`}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                Status
              </label>
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-wood-500"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as OrderStatus | "all")
                }
              >
                <option value="all">ALL STATUSES</option>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                Date Range
              </label>
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-wood-500"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              >
                <option value="all">ALL TIME</option>
                <option value="today">TODAY</option>
                <option value="this_month">THIS MONTH</option>
                <option value="this_year">THIS YEAR</option>
                <option value="custom">CUSTOM RANGE</option>
              </select>
            </div>

            {/* Custom Dates */}
            {datePreset === "custom" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-wood-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-wood-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Clear Filters (Desktop - takes empty space if not custom) */}
            <div
              className={`${datePreset === "custom" ? "lg:col-span-4" : "lg:col-span-2"} flex justify-end`}
            >
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setDatePreset("all");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs font-bold text-gray-400 hover:text-wood-600 transition-colors uppercase tracking-widest flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-4 h-12 bg-gray-50/50"></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No orders found for the selected filters.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {order.customer_name}
                    </div>
                    <div className="text-xs text-gray-500">{order.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                    ₦{order.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full uppercase tracking-tighter ${STATUS_COLORS[order.status]}`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      className="text-wood-600 hover:text-wood-500 font-medium text-sm transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-32 animate-pulse"
            ></div>
          ))
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No orders found for the selected filters.
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-mono text-gray-400">
                    #{order.id.slice(0, 8)}
                  </div>
                  <div className="font-bold text-gray-900">
                    {order.customer_name}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${STATUS_COLORS[order.status]}`}
                >
                  {order.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
                <div className="text-gray-500">
                  {formatDate(order.created_at, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="font-bold text-gray-900">
                  ₦{order.total.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(order)}
                className="w-full text-center py-2 bg-charcoal-800 text-white rounded text-sm uppercase tracking-wider font-bold transition-colors"
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-30"
                >
                  &laquo;
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${
                      currentPage === i + 1
                        ? "z-10 bg-wood-500 text-white"
                        : "text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-30"
                >
                  &raquo;
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-charcoal-900/75 transition-opacity"
              onClick={() => setSelectedOrder(null)}
            ></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">
              &#8203;
            </span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
              <div className="bg-charcoal-900 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="text-xl font-bold uppercase tracking-tight">
                  Order Details
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="bg-white p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-gray-100">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                      Customer Information
                    </h4>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-gray-900">
                        {selectedOrder.customer_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.phone}
                      </p>
                    </div>
                    <div className="pt-2">
                      <p className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1">
                        Shipping Address
                      </p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">
                        {selectedOrder.address}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                      Order Status
                    </h4>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${STATUS_COLORS[selectedOrder.status]}`}
                      >
                        {selectedOrder.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="space-y-2 pt-2">
                      <p className="text-xs text-gray-500">
                        <span className="font-bold">Reserved:</span>{" "}
                        {formatDate(selectedOrder.reserved_at)}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="font-bold">Expires:</span>{" "}
                        {formatDate(selectedOrder.expires_at)}
                      </p>
                    </div>
                    <div className="pt-4">
                      <label className="block text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">
                        Change Status
                      </label>
                      <select
                        className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-wood-500"
                        value={selectedOrder.status}
                        onChange={(e) =>
                          handleStatusUpdate(
                            selectedOrder.id,
                            e.target.value as OrderStatus,
                          )
                        }
                        disabled={updatingStatus === selectedOrder.id}
                      >
                        {Object.keys(STATUS_COLORS).map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ").toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                      Order Summary
                    </h4>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          ₦{selectedOrder.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col bg-gray-50 p-3 rounded border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                              Delivery Fee (Records Only)
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-gray-400 text-sm">₦</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={tempFee}
                                onChange={(e) => setTempFee(e.target.value)}
                                disabled={
                                  updatingFee === selectedOrder.id ||
                                  ![
                                    "paid",
                                    "shipped",
                                    "delivery_in_progress",
                                    "delivered",
                                    "completed",
                                  ].includes(selectedOrder.status)
                                }
                                className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-sm font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-wood-500 disabled:opacity-50"
                                placeholder="0.00"
                              />
                              {[
                                "paid",
                                "shipped",
                                "delivery_in_progress",
                                "delivered",
                                "completed",
                              ].includes(selectedOrder.status) && (
                                <button
                                  onClick={() =>
                                    handleDeliveryFeeUpdate(selectedOrder.id)
                                  }
                                  disabled={updatingFee === selectedOrder.id}
                                  className="bg-wood-500 hover:bg-wood-600 disabled:opacity-50 text-white text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase"
                                >
                                  {updatingFee === selectedOrder.id
                                    ? "..."
                                    : "Save"}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                              Total Paid
                            </p>
                            <p className="text-lg font-black text-wood-600">
                              ₦{selectedOrder.total.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {![
                          "paid",
                          "shipped",
                          "delivery_in_progress",
                          "delivered",
                          "completed",
                        ].includes(selectedOrder.status) && (
                          <p className="text-[9px] text-gray-400 uppercase italic">
                            * Fee can only be added for paid orders
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedOrder.transactions?.[0] && (
                      <div className="pt-4 space-y-3 bg-gray-50 p-4 rounded border border-gray-100">
                        <h5 className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                          Transaction Info
                        </h5>
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500">
                            <span className="font-bold">ID:</span>{" "}
                            {selectedOrder.transactions[0].id}
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">
                            {selectedOrder.transactions[0].status} •{" "}
                            {selectedOrder.transactions[0].reference}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                    Items Ordered
                  </h4>
                  <div className="overflow-hidden border border-gray-100 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Product
                          </th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Price
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedOrder.order_items?.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.products?.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <div className="text-gray-900 font-bold">
                                {formatPrice(Number(item.price))}
                              </div>
                              {item.original_price &&
                                Number(item.original_price) !==
                                  Number(item.price) && (
                                  <div className="text-[10px] text-gray-400 line-through">
                                    {formatPrice(Number(item.original_price))}
                                  </div>
                                )}
                              {item.discount_type && (
                                <div className="text-[9px] text-wood-500 font-bold uppercase tracking-tighter">
                                  {item.discount_type === "percentage"
                                    ? `${item.discount_value}% OFF`
                                    : `${formatPrice(Number(item.discount_value))} OFF`}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 font-bold">
                              {formatPrice(
                                Number(item.price) * Number(item.quantity),
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Transaction Details for User Request */}
                {selectedOrder.transactions?.[0] && (
                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-4">
                      Detailed Payment Information
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          ID
                        </p>
                        <p
                          className="text-xs font-mono text-gray-600 mt-1 truncate"
                          title={selectedOrder.transactions[0].id}
                        >
                          {selectedOrder.transactions[0].id}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Reference
                        </p>
                        <p
                          className="text-xs font-mono text-gray-600 mt-1 truncate"
                          title={selectedOrder.transactions[0].reference}
                        >
                          {selectedOrder.transactions[0].reference}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Amount
                        </p>
                        <p className="text-xs font-bold text-gray-600 mt-1">
                          ₦
                          {selectedOrder.transactions[0].amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Currency
                        </p>
                        <p className="text-xs font-bold text-gray-600 mt-1 uppercase">
                          {selectedOrder.transactions[0].currency || "NGN"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Gateway
                        </p>
                        <p className="text-xs text-gray-600 mt-1 uppercase font-bold">
                          {(() => {
                            const raw =
                              selectedOrder.transactions[0].raw_response;
                            if (!raw) return "N/A";
                            if (raw.flw_ref || raw.data?.flw_ref || raw.txRef)
                              return "Flutterwave";
                            if (
                              raw.customer?.customer_code ||
                              raw.data?.customer?.customer_code ||
                              raw.authorization
                            )
                              return "Paystack";
                            return "N/A";
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Status
                        </p>
                        <p className="text-xs font-bold text-gray-600 mt-1 uppercase tracking-tighter">
                          {selectedOrder.transactions[0].status}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Channel
                        </p>
                        <p className="text-xs text-gray-600 mt-1 uppercase">
                          {selectedOrder.transactions[0].raw_response
                            ?.channel ||
                            selectedOrder.transactions[0].raw_response
                              ?.payment_type ||
                            selectedOrder.transactions[0].raw_response?.data
                              ?.channel ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-md border border-gray-300 bg-white px-6 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none transition-all uppercase tracking-widest"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
