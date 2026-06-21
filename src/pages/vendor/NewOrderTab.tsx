import React, { useState } from "react";
import type { Product, Order, OrderItem } from "../../types";
import { 
  Plus, Minus, Search, ArrowLeft, ArrowRight, 
  Percent, CreditCard, Send, CheckCircle, Copy, Share2 
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface NewOrderTabProps {
  products: Product[];
  vendorUpiId: string;
  vendorBusinessName: string;
  currencySymbol: string;
  onSaveOrder: (order: Omit<Order, "id" | "orderNumber" | "date" | "createdAt">) => Promise<Order>;
  onNavigateToTab: (tab: string) => void;
}

export const NewOrderTab: React.FC<NewOrderTabProps> = ({
  products,
  vendorBusinessName,
  currencySymbol,
  onSaveOrder,
  onNavigateToTab
}) => {
  // Navigation inside the order flow: "menu" -> "checkout" -> "success"
  const [step, setStep] = useState<"menu" | "checkout" | "success">("menu");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Cart: productId -> quantity and customized price
  const [cart, setCart] = useState<Record<string, { product: Product; quantity: number; price: number }>>({});
  
  // Checkout overrides
  const [discount, setDiscount] = useState<number>(0);
  const [customGrandTotal, setCustomGrandTotal] = useState<string>(""); // manual override

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Generated Order Details (stored after saving)
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);

  // Datalist categories
  const enabledProducts = products.filter(p => p.status === "enabled");
  const categories = ["All", ...Array.from(new Set(enabledProducts.map(p => p.category)))];

  // Sync manual grand total placeholder with subtotal when cart updates
  const subtotal = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calculatedGrandTotal = Math.max(0, subtotal - discount);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: (existing?.quantity || 0) + 1,
          price: existing?.price !== undefined ? existing.price : product.defaultPrice
        }
      };
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev[productId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: {
          ...existing,
          quantity: existing.quantity - 1
        }
      };
    });
  };

  const handleUpdateItemPrice = (productId: string, newPrice: number) => {
    setCart(prev => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          price: newPrice
        }
      };
    });
  };

  const handleProceedToCheckout = () => {
    if (Object.keys(cart).length === 0) return;
    setDiscount(0);
    setCustomGrandTotal("");
    setStep("checkout");
  };

  const handleGeneratePaymentAndShare = async () => {
    // 1. Determine final total
    const finalTotal = customGrandTotal !== "" ? parseFloat(customGrandTotal) : calculatedGrandTotal;
    if (isNaN(finalTotal) || finalTotal < 0) {
      alert("Invalid total amount.");
      return;
    }

    // 2. Format cart items
    const items: OrderItem[] = Object.values(cart).map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.price,
      quantity: item.quantity
    }));

    // 3. Generate dummy/draft order properties to pass to database
    // The database generates date and unique order numbers like ORD-1002
    // We mock the UPI deep link creation, but the DB returns the real finalized deep link with order number!
    const draftOrderData = {
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      items,
      subtotal,
      discount: subtotal - finalTotal, // dynamic discount difference
      grandTotal: finalTotal,
      status: "pending" as const,
      upiDeepLink: "" // populated dynamically after order is generated in DB
    };

    try {
      const finalizedOrder = await onSaveOrder(draftOrderData);
      setSavedOrder(finalizedOrder);
      setStep("success");
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.85 }
      });
    } catch (error) {
      console.error("Failed to process checkout:", error);
      alert("Billing generation failed. Please check your inputs.");
    }
  };

  const getWhatsAppLink = () => {
    if (!savedOrder) return "";

    // Build receipt details string
    let detailsStr = `🍽 *${vendorBusinessName}*\n`;
    detailsStr += `Thank you for your order.\n\n`;
    detailsStr += `*Order Details:*\n`;
    savedOrder.items.forEach(item => {
      detailsStr += `• ${item.name} ×${item.quantity} — ${currencySymbol}${item.price * item.quantity}\n`;
    });
    
    if (savedOrder.discount > 0) {
      detailsStr += `\n*Subtotal:* ${currencySymbol}${savedOrder.subtotal}\n`;
      detailsStr += `*Discount:* -${currencySymbol}${savedOrder.discount}\n`;
    }
    
    detailsStr += `\n*Total:* *${currencySymbol}${savedOrder.grandTotal}*\n\n`;
    detailsStr += `Tap below to pay securely via any UPI app:\n`;
    detailsStr += `${savedOrder.upiDeepLink}\n\n`;
    detailsStr += `Thank you for choosing us!`;

    const encodedText = encodeURIComponent(detailsStr);
    
    if (savedOrder.customerPhone) {
      // Direct number chat
      let phone = savedOrder.customerPhone.replace(/\D/g, "");
      if (phone.length === 10) {
        phone = "91" + phone;
      }
      return `https://wa.me/${phone}?text=${encodedText}`;
    }
    
    // Fallback selection chat sheet
    return `https://wa.me/?text=${encodedText}`;
  };

  const handleShare = () => {
    const link = getWhatsAppLink();
    if (link) {
      window.open(link, "_blank");
    }
  };

  const handleCopyLink = () => {
    if (savedOrder) {
      navigator.clipboard.writeText(savedOrder.upiDeepLink);
      alert("UPI deep link copied to clipboard!");
    }
  };

  const filteredProducts = enabledProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-[70vh] flex flex-col justify-between">
      
      {/* STEP 1: SELECT PRODUCTS MENU */}
      {step === "menu" && (
        <div className="space-y-4 pb-24 flex-grow flex flex-col justify-between">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-xs font-semibold focus:outline-none"
              />
            </div>

            {/* Category Pills */}
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

            {/* Products Grid cards */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 glass-card rounded-2xl py-12 text-center text-slate-500 font-medium text-xs">
                  No products in catalog.
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const qty = cart[prod.id]?.quantity || 0;
                  return (
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAddToCart(prod)}
                      key={prod.id}
                      className={`glass-card rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between relative h-28 ${
                        qty > 0 ? "border-brand-purple/50 bg-brand-purple/5" : "border-white/5"
                      }`}
                    >
                      {/* Top line category */}
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{prod.category}</span>
                        {qty > 0 && (
                          <span className="bg-brand-purple text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center glow-purple">
                            {qty}
                          </span>
                        )}
                      </div>

                      {/* Middle line title */}
                      <span className="text-xs font-bold text-slate-200 block truncate mt-1">{prod.name}</span>

                      {/* Bottom line price / quick toggle */}
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                        <span className="text-xs font-black text-brand-purple-light">
                          {currencySymbol}{prod.defaultPrice}
                        </span>
                        
                        {/* Inline plus-minus selector */}
                        <div className="flex items-center gap-1.5 onClick-bubble" onClick={(e) => e.stopPropagation()}>
                          {qty > 0 && (
                            <button
                              onClick={() => handleRemoveFromCart(prod.id)}
                              className="p-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAddToCart(prod)}
                            className="p-1 bg-brand-purple text-white rounded-lg hover:brightness-110"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Floating Bill summary */}
          {subtotal > 0 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="fixed bottom-[84px] left-0 w-full px-4 z-30"
            >
              <div className="max-w-md mx-auto glass-panel border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Items Added ({Object.values(cart).reduce((s, i) => s + i.quantity, 0)})</span>
                  <span className="text-sm font-bold text-slate-300">Bill: </span>
                  <span className="text-base font-black text-slate-100">{currencySymbol}{subtotal}</span>
                </div>
                <button
                  onClick={handleProceedToCheckout}
                  className="flex items-center gap-1 bg-brand-purple hover:brightness-110 text-white text-xs font-extrabold px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  <span>Checkout Bill</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* STEP 2: BILL OVERRIDES & CUSTOMER ENTRY */}
      {step === "checkout" && (
        <div className="space-y-5 pb-24 flex-grow">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("menu")}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-extrabold text-lg text-slate-200">Review & Customize Bill</h3>
          </div>

          {/* Cart items list with customizable prices */}
          <div className="glass-card rounded-2xl border border-white/5 p-4 space-y-3.5 max-h-[220px] overflow-y-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customise Item Unit Prices</span>
            {Object.values(cart).map((item) => (
              <div key={item.product.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <div className="space-y-0.5 max-w-[60%]">
                  <span className="text-xs font-bold text-slate-200 block truncate">{item.product.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Qty: ×{item.quantity}</span>
                </div>
                
                {/* Editable price field */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleUpdateItemPrice(item.product.id, parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-center text-xs font-bold focus:outline-none focus:border-brand-purple"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Overrides and Customer Forms */}
          <div className="glass-card rounded-2xl border border-white/5 p-4 space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Financial Overrides</span>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Discount Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Percent className="w-3 h-3 text-brand-pink-light" />
                  <span>Discount ({currencySymbol})</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={discount === 0 ? "" : discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Grand Total Override */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-brand-cyan-light" />
                  <span>Override Grand Total</span>
                </label>
                <input
                  type="number"
                  placeholder={calculatedGrandTotal.toString()}
                  value={customGrandTotal}
                  onChange={(e) => setCustomGrandTotal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Customer entry */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Details (Optional)</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold block">Customer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold block">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Big checkout action */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleGeneratePaymentAndShare}
            className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-2xl glow-purple hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            <span>Generate Payment Link</span>
          </motion.button>
        </div>
      )}

      {/* STEP 3: TRANSACTION GENERATED SUCCESSFULLY */}
      {step === "success" && savedOrder && (
        <div className="space-y-6 pb-24 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto text-green-400"
          >
            <CheckCircle className="w-10 h-10" />
          </motion.div>
          
          <div className="space-y-1">
            <h3 className="font-extrabold text-xl text-slate-100">Bill Created Successfully!</h3>
            <p className="text-xs text-slate-400">Order: {savedOrder.orderNumber} • Amount: {currencySymbol}{savedOrder.grandTotal}</p>
          </div>

          {/* QR Code Container */}
          <div className="glass-card rounded-3xl p-6 border border-white/5 max-w-[280px] mx-auto flex flex-col items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-inner w-[200px] h-[200px] flex items-center justify-center">
              {/* Public QR Code API */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(savedOrder.upiDeepLink)}`} 
                alt="UPI Payment QR Code" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scan QR with any UPI App</span>
          </div>

          {/* Quick buttons */}
          <div className="space-y-3.5 max-w-sm mx-auto">
            {/* Share on WhatsApp */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleShare}
              className="w-full py-4.5 bg-[#25D366] text-white font-black rounded-2xl shadow-lg hover:brightness-105 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              <span>Share on WhatsApp</span>
            </motion.button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopyLink}
                className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </button>
              <button
                onClick={() => {
                  setCart({});
                  setCustomerName("");
                  setCustomerPhone("");
                  setStep("menu");
                  onNavigateToTab("dashboard");
                }}
                className="py-3 bg-brand-purple/10 border border-brand-purple/20 hover:bg-brand-purple/20 rounded-xl text-xs font-bold text-brand-purple-light transition-all"
              >
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
