"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { calculateFinalPrice } from "@/lib/priceUtils";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: "single" | "kit";
  stock: number;
  image_url: string;
  is_active: boolean;
  discount_active: boolean;
  discount_type: "percentage" | "fixed";
  discount_value: number;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "confirm";
    action?: () => void;
  } | null>(null);

  useEffect(() => {
    fetchProducts();
    // Close menu when clicking outside
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  const showToast = (
    message: string,
    type: "success" | "error" | "confirm",
    action?: () => void,
  ) => {
    setToast({ message, type, action });
    if (type !== "confirm") {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      showToast("Product deleted successfully", "success");
      fetchProducts();
    } catch (err: any) {
      console.error("Error deleting product:", err);
      showToast(err.message || "Failed to delete product", "error");
    } finally {
      setLoading(false);
      setToast(null);
    }
  };

  const confirmDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setOpenMenuId(null);
    showToast("Permanently delete this product?", "confirm", () =>
      handleDelete(id),
    );
  };

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setEditingProduct({
      ...editingProduct,
      name,
      slug: editingProduct?.id ? editingProduct.slug : slug, // Only auto-slug for new products OR manual edit allowed below
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(filePath);

      setEditingProduct({
        ...editingProduct,
        image_url: publicUrl,
      });
      showToast("Image uploaded!", "success");
    } catch (err: any) {
      console.error("Error uploading image:", err);
      showToast(err.message || "Failed to upload image", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct({
      name: "",
      slug: "",
      description: "",
      price: 0,
      category: "single",
      stock: 0,
      image_url: "",
      is_active: true,
      discount_active: false,
      discount_type: "percentage",
      discount_value: 0,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
    setOpenMenuId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      setLoading(true);
      const isNew = !editingProduct.id;

      if (editingProduct.stock! < 0) {
        throw new Error("Stock cannot be negative");
      }

      if (editingProduct.discount_active) {
        if (editingProduct.discount_value! < 0) {
          throw new Error("Discount value cannot be negative");
        }
        if (
          editingProduct.discount_type === "percentage" &&
          editingProduct.discount_value! > 90
        ) {
          throw new Error("Percentage discount cannot exceed 90%");
        }
        if (
          editingProduct.discount_type === "fixed" &&
          editingProduct.discount_value! >= editingProduct.price!
        ) {
          throw new Error(
            "Fixed discount must be less than the original price",
          );
        }
      }

      if (isNew) {
        const { error } = await supabase
          .from("products")
          .insert([editingProduct]);
        if (error) throw error;
        showToast("Product created!", "success");
      } else {
        const { error } = await supabase
          .from("products")
          .update(editingProduct)
          .eq("id", editingProduct.id);
        if (error) throw error;
        showToast("Product updated!", "success");
      }

      setIsFormOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      console.error("Error saving product:", err);
      showToast(err.message || "Failed to save product", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-8 z-[100] animate-slide-in">
          <div
            className={`rounded-lg shadow-xl p-4 min-w-[300px] border flex flex-col gap-3 ${
              toast.type === "confirm"
                ? "bg-white border-charcoal-200"
                : toast.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${
                    toast.type === "confirm"
                      ? "text-charcoal-400"
                      : toast.type === "error"
                        ? "text-red-500"
                        : "text-green-600"
                  }`}
                >
                  {toast.type === "confirm" ? "Confirmation" : toast.type}
                </p>
                <p className="font-bold text-gray-900 leading-tight">
                  {toast.message}
                </p>
              </div>
              {toast.type !== "confirm" && (
                <button
                  onClick={() => setToast(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  ✕
                </button>
              )}
            </div>
            {toast.type === "confirm" && (
              <div className="flex gap-2">
                <button
                  onClick={toast.action}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setToast(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-600 text-sm">Manage your product catalog</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="w-full md:w-auto bg-wood-500 hover:bg-wood-600 text-white px-6 py-2 rounded transition-colors text-sm font-bold uppercase tracking-wide"
        >
          Add Product
        </button>
      </div>

      {loading && !isFormOpen && !toast ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wood-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg border border-red-200 mb-6 font-semibold">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => handleOpenEdit(product)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden relative border border-gray-100">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              ?
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {product.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-charcoal-100 text-charcoal-800 uppercase">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ₦{product.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={
                          product.stock <= 5 ? "text-red-600 font-bold" : ""
                        }
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === product.id ? null : product.id,
                          );
                        }}
                        className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === product.id && (
                        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 py-1">
                          <button
                            onClick={() => {
                              handleOpenEdit(product);
                              setOpenMenuId(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <svg
                              className="w-4 h-4 mr-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                            View / Edit
                          </button>
                          <button
                            onClick={(e) => confirmDelete(e, product.id)}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg
                              className="w-4 h-4 mr-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isFormOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {editingProduct.id ? "Edit Product" : "New Product"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Product Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none text-gray-900"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Slug*
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.slug}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        slug: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none text-gray-900 bg-gray-50"
                    placeholder="product-slug"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Auto-generated from name
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Category*
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none text-gray-900"
                  >
                    <option value="single">Single Product</option>
                    <option value="kit">Kit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Price (₦)*
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Stock*
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingProduct.stock}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stock: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Product Image
                  </label>
                  <div className="flex items-start gap-4">
                    <div className="h-24 w-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative border-2 border-dashed border-gray-300">
                      {editingProduct.image_url ? (
                        <Image
                          src={editingProduct.image_url}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-2">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-wood-50 file:text-wood-700
                          hover:file:bg-wood-100 transition-all cursor-pointer"
                      />
                      <div className="relative">
                        <input
                          type="text"
                          value={editingProduct.image_url}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              image_url: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none text-gray-900"
                          placeholder="Or paste image URL here..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={editingProduct.description}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        description: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none resize-none text-gray-900"
                    placeholder="Product details..."
                  />
                </div>

                <div className="md:col-span-2 flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editingProduct.is_active}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        is_active: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-wood-600 focus:ring-wood-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 block text-sm font-semibold text-gray-700"
                  >
                    Product is Active (Visible on site)
                  </label>
                </div>

                {/* Discount Section */}
                <div className="md:col-span-2 space-y-4 border-t border-gray-100 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Product Discount
                      </h4>
                      <p className="text-xs text-gray-500">
                        Apply a limited-time price reduction
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="discount_active"
                        checked={editingProduct.discount_active}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            discount_active: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-wood-600 focus:ring-wood-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="discount_active"
                        className="ml-2 block text-sm font-semibold text-gray-700"
                      >
                        Enable Discount
                      </label>
                    </div>
                  </div>

                  {editingProduct.discount_active && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                          Discount Type
                        </label>
                        <select
                          value={editingProduct.discount_type}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              discount_type: e.target.value as any,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wood-500 outline-none bg-white text-gray-900"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₦)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                          {editingProduct.discount_type === "percentage"
                            ? "Percentage Off"
                            : "Amount Off"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={
                            editingProduct.discount_type === "percentage"
                              ? 90
                              : undefined
                          }
                          value={editingProduct.discount_value}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              discount_value: Number(e.target.value),
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wood-500 outline-none bg-white text-gray-900 font-bold"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                          Preview Final Price
                        </label>
                        <p className="text-lg font-black text-wood-600">
                          ₦
                          {calculateFinalPrice(
                            editingProduct as any,
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2 bg-wood-500 hover:bg-wood-600 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
