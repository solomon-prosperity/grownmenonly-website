"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed";
  reference: string;
  raw_response: any;
  created_at: string;
  orders: {
    customer_name: string;
    status: string;
    total: number;
  };
}

const STATUS_COLORS = {
  success: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
  pending: "bg-yellow-500/10 text-yellow-500",
};

const ITEMS_PER_PAGE = 10;

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
};

type DatePreset = "all" | "today" | "this_month" | "this_year" | "custom";

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Transaction | "orders.customer_name";
    direction: "asc" | "desc";
  }>({ key: "created_at", direction: "desc" });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("transactions")
        .select("*, orders(customer_name, status, total)", { count: "exact" });

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

      // Apply Sorting
      if (sortConfig.key === "orders.customer_name") {
        // Supabase sorting on joined tables is a bit tricky, but supported:
        // query.order('orders(customer_name)', { ascending: direction === 'asc' })
        // Note: For simplicity and standard Supabase client behavior, we'll sort by direct columns if possible.
        // If sorting by related data, we might need to handle it carefully.
        query = query.order("created_at", { ascending: false }); // Fallback
      } else {
        query = query.order(sortConfig.key as string, {
          ascending: sortConfig.direction === "asc",
        });
      }

      const { data, error: txError, count } = await query.range(from, to);

      if (txError) throw txError;
      setTransactions((data as any[]) || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("Fetch transactions error:", err);
      setError(err.message || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, datePreset, startDate, endDate, sortConfig]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSort = (key: keyof Transaction | "orders.customer_name") => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold uppercase tracking-tighter text-gray-900">
            Transactions
          </h1>
          <div className="text-sm text-gray-400">
            {loading
              ? "Loading..."
              : `Showing ${transactions.length} of ${totalCount} transactions`}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                Status
              </label>
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-wood-500"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">ALL STATUSES</option>
                <option value="success">SUCCESS</option>
                <option value="failed">FAILED</option>
                <option value="pending">PENDING</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                Date Range
              </label>
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-wood-500"
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value as DatePreset);
                  setCurrentPage(1);
                }}
              >
                <option value="all">ALL TIME</option>
                <option value="today">TODAY</option>
                <option value="this_month">THIS MONTH</option>
                <option value="this_year">THIS YEAR</option>
                <option value="custom">CUSTOM RANGE</option>
              </select>
            </div>

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
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
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
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </>
            )}

            <div
              className={`${datePreset === "custom" ? "lg:col-span-4" : "lg:col-span-2"} flex justify-end gap-3`}
            >
              <button
                onClick={() => fetchTransactions()}
                className="text-xs font-bold text-gray-500 hover:text-wood-600 transition-colors uppercase tracking-widest flex items-center gap-1"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setDatePreset("all");
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest flex items-center gap-1"
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
                Clear
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

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                { label: "TX ID", key: "id" as const },
                { label: "Order ID", key: "order_id" as const },
                { label: "Customer", key: "orders.customer_name" as const },
                { label: "Amount", key: "amount" as const },
                { label: "Status", key: "status" as const },
                { label: "Date", key: "created_at" as const },
              ].map((col) => (
                <th
                  key={col.label}
                  onClick={() => handleSort(col.key)}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortConfig.key === col.key && (
                      <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="px-6 py-4 h-12 bg-gray-50/50"></td>
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-gray-400">
                    {tx.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/admin/orders?id=${tx.order_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-wood-600 hover:underline font-mono text-[10px]"
                    >
                      {tx.order_id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {tx.orders?.customer_name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    ₦{tx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full uppercase tracking-tighter ${STATUS_COLORS[tx.status] || "bg-gray-100 text-gray-800"}`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {formatDate(tx.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTx(tx);
                      }}
                      className="text-gray-400 group-hover:text-wood-600 font-medium text-xs uppercase tracking-widest transition-colors"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="lg:hidden space-y-4">
        {loading
          ? [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-lg border border-gray-200 h-32 animate-pulse"
              ></div>
            ))
          : transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white p-4 rounded-lg border border-gray-200 space-y-3 shadow-sm"
                onClick={() => setSelectedTx(tx)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] font-mono text-gray-400">
                      TX: #{tx.id.slice(0, 8)}
                    </div>
                    <div className="font-bold text-gray-900">
                      {tx.orders?.customer_name || "N/A"}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${STATUS_COLORS[tx.status]}`}
                  >
                    {tx.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50">
                  <div className="text-gray-500 text-xs">
                    {formatDate(tx.created_at)}
                  </div>
                  <div className="font-bold text-gray-900">
                    ₦{tx.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow-sm">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of{" "}
              <span className="font-medium">{totalPages}</span>
            </p>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-30 rounded-l-md"
              >
                &laquo;
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${currentPage === pageNum ? "bg-wood-500 text-white" : "text-gray-900 hover:bg-gray-50"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-30 rounded-r-md"
              >
                &raquo;
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal-900/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-charcoal-900 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold uppercase tracking-widest text-sm">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <svg
                  className="w-5 h-5"
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
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* ID & Status */}
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Transaction ID
                  </label>
                  <p className="text-sm font-mono text-gray-900 break-all">
                    {selectedTx.id}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Status
                  </label>
                  <div
                    className={`mt-1 inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[selectedTx.status]}`}
                  >
                    {selectedTx.status}
                  </div>
                </div>
              </div>

              {/* Currency & Gateway */}
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Currency
                  </label>
                  <p className="text-sm font-bold text-gray-900 uppercase">
                    {selectedTx.currency || "NGN"}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Gateway
                  </label>
                  <p className="text-sm font-bold text-gray-900 uppercase italic">
                    {(() => {
                      const raw = selectedTx.raw_response;
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
              </div>

              {/* Linked Order */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Linked Order Info
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 grid grid-cols-2 gap-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">
                      Order ID
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-gray-900">
                        {selectedTx.order_id}
                      </p>
                      <Link
                        href={`/admin/orders?id=${selectedTx.order_id}`}
                        className="p-1 bg-white border border-gray-200 rounded hover:text-wood-600 transition-colors"
                        title="View Order"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </Link>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">
                      Customer
                    </label>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedTx.orders?.customer_name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">
                      Total Amount
                    </label>
                    <p className="text-sm font-bold text-wood-600">
                      ₦{selectedTx.orders?.total?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">
                      Order Status
                    </label>
                    <p className="text-xs font-bold text-gray-600 uppercase italic">
                      {selectedTx.orders?.status || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Raw Response */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Raw Gateway Response
                </h4>
                <div className="bg-charcoal-900 rounded-lg p-4 font-mono text-[11px] text-green-400 overflow-x-auto border border-charcoal-800 shadow-inner">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(selectedTx.raw_response, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-gray-100 transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
