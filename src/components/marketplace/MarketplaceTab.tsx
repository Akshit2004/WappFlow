"use client";

import React, { useState, useEffect} from "react";
import { useParams } from "next/navigation";
import {
  ShoppingBag,
  Package,
  Plus,
  Edit3,
  Trash2,
  X,
  Search,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  isActive: boolean;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  orderId: string;
  total: number;
  status: string;
  paymentStatus: string;
  phone: string;
  address: Record<string, unknown> | string;
  items: OrderItem[];
  createdAt: string;
}

export const MarketplaceTab: React.FC = () => {
  const params = useParams();
  const orgId = params.orgId as string;

  const [activeSection, setActiveSection] = useState<"overview" | "products" | "orders">("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "0",
  });

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        const [resP, resO] = await Promise.all([
          fetch(`/api/marketplace/catalog?orgId=${orgId}`),
          fetch(`/api/org/${orgId}/data`)
        ]);
        const dataP = await resP.json();
        const dataO = await resO.json();
        if (mounted) {
          setProducts(dataP.products || []);
          if (dataO.orders) setOrders(dataO.orders);
        }
      } catch (err) {
        console.error("Failed to fetch marketplace data", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAll();
    return () => { mounted = false; };
  }, [orgId]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/marketplace/catalog?orgId=${orgId}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", category: "", stock: "0" });
    setEditProduct(null);
    setShowAddProduct(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: form.name,
      description: form.description,
      price: Math.round(parseFloat(form.price) * 100),
      category: form.category,
      stock: parseInt(form.stock) || 0,
      organizationId: orgId,
    };

    if (editProduct) {
      await fetch(`/api/marketplace/products/${editProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/marketplace/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    resetForm();
    await fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    await fetch(`/api/marketplace/products/${id}`, { method: "DELETE" });
    await fetchProducts();
  };

  const startEdit = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: (product.price / 100).toString(),
      category: product.category,
      stock: product.stock.toString(),
    });
    setEditProduct(product);
    setShowAddProduct(true);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.isActive).length,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    revenue: orders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.total, 0),
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fafaf9]">
        <RefreshCw className="w-6 h-6 text-stone-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9]">
      <div className="flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-stone-950 flex items-center justify-center border border-stone-950">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900 uppercase">Marketplace</h1>
            <p className="text-xs text-stone-500">Manage products and orders</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection("overview")}
            className={`px-4 py-2 rounded-none text-xs font-bold border transition-all cursor-pointer ${
              activeSection === "overview" ? "bg-stone-950 text-white border-stone-950" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection("products")}
            className={`px-4 py-2 rounded-none text-xs font-bold border transition-all cursor-pointer ${
              activeSection === "products" ? "bg-stone-950 text-white border-stone-950" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveSection("orders")}
            className={`px-4 py-2 rounded-none text-xs font-bold border transition-all cursor-pointer ${
              activeSection === "orders" ? "bg-stone-950 text-white border-stone-950" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      {activeSection === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Total Products" value={stats.totalProducts} color="stone" />
          <StatCard icon={ShoppingBag} label="Active Products" value={stats.activeProducts} color="stone" />
          <StatCard icon={Package} label="Pending Orders" value={stats.pendingOrders} color="stone" />
          <StatCard icon={ExternalLink} label="Revenue (paid)" value={`₹${(stats.revenue / 100).toFixed(2)}`} color="stone" />
        </div>
      )}

      {activeSection === "products" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-none bg-white border border-stone-200 text-sm focus:outline-none focus:border-stone-900"
              />
            </div>
            <button
              onClick={() => { resetForm(); setShowAddProduct(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-950 text-white rounded-none border border-stone-950 text-xs font-bold hover:bg-stone-900 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> ADD PRODUCT
            </button>
          </div>

          {showAddProduct && (
            <form onSubmit={handleSubmit} className="bg-white rounded-none p-6 border border-stone-200 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="font-bold text-stone-900 uppercase text-xs">{editProduct ? "Edit Product" : "Add Product"}</h3>
                <button type="button" onClick={resetForm} className="p-1 hover:bg-stone-100 rounded-none cursor-pointer border border-transparent">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <InputField label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} required />
                <InputField label="Price (₹)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required />
                <InputField label="Stock" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-none border border-stone-200 text-sm focus:outline-none focus:border-stone-900 resize-none"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-stone-950 text-white rounded-none border border-stone-950 text-xs font-bold hover:bg-stone-900 transition-all cursor-pointer uppercase"
              >
                {editProduct ? "Update Product" : "Create Product"}
              </button>
            </form>
          )}

          <div className="bg-white rounded-none border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
                    <th className="text-left px-4 py-3">Product</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-right px-4 py-3">Price</th>
                    <th className="text-right px-4 py-3">Stock</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-t border-stone-200 hover:bg-stone-50/50">
                      <td className="px-4 py-3 font-bold text-stone-900">{product.name}</td>
                      <td className="px-4 py-3 text-stone-500">{product.category}</td>
                      <td className="px-4 py-3 text-right">₹{(product.price / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{product.stock}</td>
                      <td className="px-4 py-3 text-center">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-900 bg-stone-100 px-2 py-0.5 border border-stone-300 rounded-none uppercase">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 bg-stone-50 px-2 py-0.5 border border-stone-200 rounded-none uppercase">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(product)} className="p-1.5 hover:bg-stone-100 rounded-none text-stone-500 hover:text-stone-900 border border-transparent cursor-pointer">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteProduct(product.id)} className="p-1.5 hover:bg-stone-100 rounded-none text-stone-500 hover:text-stone-900 border border-transparent cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-stone-450 text-xs uppercase">No products found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSection === "orders" && (
        <div className="bg-white rounded-none border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
                  <th className="text-left px-4 py-3">Order ID</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-stone-200 hover:bg-stone-50/50">
                    <td className="px-4 py-3 text-xs font-bold text-stone-900">{order.orderId}</td>
                    <td className="px-4 py-3 text-stone-500">
                      {order.items?.map((i) => `${i.name} x${i.quantity}`).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">₹{(order.total / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaymentBadge status={order.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{order.phone}</td>
                    <td className="px-4 py-3 text-stone-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-stone-450 text-xs uppercase">No orders yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-none p-5 border border-stone-200 flex items-center gap-4 shadow-none">
      <div className="w-12 h-12 rounded-none flex items-center justify-center border bg-stone-100 text-stone-900 border-stone-300">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-stone-500 font-bold uppercase">{label}</p>
        <p className="text-xl font-extrabold text-stone-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-stone-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 rounded-none border border-stone-200 text-sm focus:outline-none focus:border-stone-900 transition-all"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none border border-stone-300 bg-stone-50 text-stone-700 uppercase">
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const isPaid = status.toLowerCase() === "paid";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none border uppercase ${
      isPaid ? "bg-stone-900 text-white border-stone-950" : "bg-stone-100 text-stone-900 border-stone-300"
    }`}>
      {status}
    </span>
  );
}
