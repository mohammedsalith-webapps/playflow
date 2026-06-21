import React, { useState } from "react";
import type { Product } from "../../types";
import { Search, Plus, Edit2, Trash2, Eye, EyeOff, X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductsTabProps {
  products: Product[];
  currencySymbol: string;
  onAddProduct: (product: Omit<Product, "id" | "createdAt">) => Promise<void>;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  currencySymbol,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Add/Edit Product Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form inputs
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<"enabled" | "disabled">("enabled");
  const [error, setError] = useState<string | null>(null);

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const handleOpenAddSheet = () => {
    setEditingProduct(null);
    setName("");
    setCategory("");
    setPrice("");
    setImageUrl("");
    setStatus("enabled");
    setError(null);
    setIsSheetOpen(true);
  };

  const handleOpenEditSheet = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategory(prod.category);
    setPrice(prod.defaultPrice.toString());
    setImageUrl(prod.imageUrl || "");
    setStatus(prod.status);
    setError(null);
    setIsSheetOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(price);
    if (!name.trim() || !category.trim() || isNaN(priceNum) || priceNum < 0) {
      setError("Please check your inputs. Name, Category, and positive Price are required.");
      return;
    }

    try {
      const prodData = {
        name: name.trim(),
        category: category.trim(),
        defaultPrice: priceNum,
        imageUrl: imageUrl.trim() || undefined,
        status
      };

      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, prodData);
      } else {
        await onAddProduct(prodData);
      }
      setIsSheetOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save product.");
    }
  };

  const handleToggleStatus = async (prod: Product) => {
    const nextStatus = prod.status === "enabled" ? "disabled" : "enabled";
    try {
      await onUpdateProduct(prod.id, { status: nextStatus as any });
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await onDeleteProduct(productId);
      } catch (err) {
        console.error("Failed to delete product:", err);
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 pb-24 relative min-h-[60vh]">
      {/* Header action / search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-xs font-semibold focus:outline-none"
          />
        </div>
        <button
          onClick={handleOpenAddSheet}
          className="flex items-center justify-center bg-gradient-to-r from-brand-purple to-brand-pink hover:brightness-110 p-3.5 rounded-2xl glow-purple text-white transition-all shrink-0"
          title="Add Product"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Category Pills horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
              selectedCategory === cat
                ? "bg-brand-purple text-white border-brand-purple"
                : "bg-white/5 text-slate-400 border-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product List Grid */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        {filteredProducts.length === 0 ? (
          <div className="col-span-2 glass-card rounded-2xl py-12 text-center text-slate-500 font-medium text-xs">
            No products found matching filters.
          </div>
        ) : (
          filteredProducts.map((prod) => (
            <motion.div
              layout
              key={prod.id}
              className={`glass-card rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative ${
                prod.status === "disabled" 
                  ? "border-red-500/10 opacity-60" 
                  : "border-white/5"
              }`}
            >
              {/* Image banner or category default */}
              <div className="h-20 w-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
                {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{prod.category}</span>
                )}
                {/* Float status pill */}
                <button
                  onClick={() => handleToggleStatus(prod)}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg border text-white transition-all ${
                    prod.status === "enabled"
                      ? "bg-green-500/20 border-green-500/30 text-green-400"
                      : "bg-red-500/20 border-red-500/30 text-red-400"
                  }`}
                  title={prod.status === "enabled" ? "Disable Product" : "Enable Product"}
                >
                  {prod.status === "enabled" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Body */}
              <div className="p-3 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{prod.category}</span>
                <span className="text-xs font-bold text-slate-200 block truncate">{prod.name}</span>
                <span className="text-sm font-black text-brand-purple-light block mt-1">
                  {currencySymbol}{prod.defaultPrice}
                </span>
              </div>

              {/* Actions Footer */}
              <div className="flex border-t border-white/5 bg-white/[0.01]">
                <button
                  onClick={() => handleOpenEditSheet(prod)}
                  className="flex-grow py-2 text-xs font-semibold text-slate-400 hover:text-brand-purple-light hover:bg-white/[0.02] flex items-center justify-center gap-1.5 border-r border-white/5 transition-all"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(prod.id)}
                  className="flex-grow py-2 text-xs font-semibold text-red-400/80 hover:text-red-400 hover:bg-red-950/10 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* BOTTOM SLIDE SHEET FOR ADD / EDIT */}
      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end justify-center">
            {/* Sheet clickout */}
            <div className="absolute inset-0" onClick={() => setIsSheetOpen(false)} />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-[#0D121F] border-t border-white/10 rounded-t-3xl p-6 space-y-5 z-10 safe-pb relative"
            >
              {/* Drag handles bar */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
              
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-lg text-slate-200">
                  {editingProduct ? "Modify Product Details" : "Create New Product"}
                </h3>
                <button 
                  onClick={() => setIsSheetOpen(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="text-xs p-2.5 bg-red-950/40 border border-red-500/25 text-red-200 rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Product Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chocolate Latte"
                    required
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category *</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Beverages"
                      required
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                      list="categories-datalist"
                    />
                    <datalist id="categories-datalist">
                      {categories.filter(c => c !== "All").map((c, i) => <option key={i} value={c} />)}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Default Price * ({currencySymbol})</label>
                    <input
                      type="number"
                      step="any"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 150"
                      required
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Image URL (optional)</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="e.g. https://domain.com/item.png"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Default Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    <option value="enabled">Enabled (Visible in Menu)</option>
                    <option value="disabled">Disabled (Hidden from Menu)</option>
                  </select>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:brightness-95 transition-all text-xs flex items-center justify-center gap-2 mt-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProduct ? "Save Changes" : "Create Product Card"}</span>
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
