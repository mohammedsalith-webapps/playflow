import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { dbProducts, dbOrders } from "../../services/db";
import type { Product, Order, OrderItem, Vendor } from "../../types";
import { VendorSetup } from "./VendorSetup";
import { DashboardTab } from "./DashboardTab";
import { ProductsTab } from "./ProductsTab";
import { NewOrderTab } from "./NewOrderTab";
import { OrdersTab } from "./OrdersTab";
import { CustomersTab } from "./CustomersTab";
import { ReportsTab } from "./ReportsTab";
import { SettingsTab } from "./SettingsTab";
import { 
  Store, LayoutDashboard, ShoppingBag, PlusCircle, 
  History, Users, BarChart3, Settings, LogOut, AlertOctagon, X, Check, Share2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ"
};

export const VendorDashboard: React.FC = () => {
  const { currentUser, logout, refreshProfile } = useAuth();
  const vendorId = currentUser?.id || "";
  const vendorData = currentUser?.data as Vendor;

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global order detail modal (triggered from Dashboard tab or Orders tab)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Repeat previous order trigger parameters
  const [repeatOrderItems, setRepeatOrderItems] = useState<{
    items: OrderItem[];
    customerName?: string;
    customerPhone?: string;
  } | null>(null);

  const loadVendorData = async () => {
    if (!vendorId) return;
    setIsLoading(true);
    try {
      const prodsList = await dbProducts.getAll(vendorId);
      const ordersList = await dbOrders.getAll(vendorId);
      setProducts(prodsList);
      setOrders(ordersList);
    } catch (err) {
      console.error("Failed to load vendor records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vendorData?.setupComplete) {
      loadVendorData();
    } else {
      setIsLoading(false);
    }
  }, [vendorId, vendorData?.setupComplete]);

  // Checks subscription expiry
  const todayStr = new Date().toISOString().split("T")[0];
  const isLicenseExpired = vendorData?.subscriptionExpiry < todayStr || vendorData?.status === "suspended";

  // Currency symbol helper
  const currencySymbol = CURRENCY_SYMBOLS[vendorData?.currency] || "₹";

  const handleSetupComplete = () => {
    refreshProfile(); // refresh state
  };

  // DB Handlers
  const handleAddProduct = async (prod: Omit<Product, "id" | "createdAt">) => {
    await dbProducts.add(vendorId, prod);
    await loadVendorData();
  };

  const handleUpdateProduct = async (productId: string, updates: Partial<Product>) => {
    await dbProducts.update(vendorId, productId, updates);
    await loadVendorData();
  };

  const handleDeleteProduct = async (productId: string) => {
    await dbProducts.delete(vendorId, productId);
    await loadVendorData();
  };

  const handleSaveOrder = async (orderData: Omit<Order, "id" | "orderNumber" | "date" | "createdAt">) => {
    // Inject merchant deep link details before saving
    // upi://pay?pa={upiId}&pn={businessName}&am={amount}&tn={orderNumber}
    // We pass empty upiDeepLink, database will format the order properties
    // but we can generate a finalized one here since we have business details:
    const tempOrderNum = `ORD-${1001 + orders.length}`;
    const cleanBusinessName = encodeURIComponent(vendorData.businessName);
    const cleanUpi = vendorData.upiId.trim();
    const cleanAmount = orderData.grandTotal.toString();
    const cleanMemo = encodeURIComponent(tempOrderNum);
    
    const formattedUpiDeepLink = `upi://pay?pa=${cleanUpi}&pn=${cleanBusinessName}&am=${cleanAmount}&tn=${cleanMemo}`;

    const orderToSave = {
      ...orderData,
      upiDeepLink: formattedUpiDeepLink
    };

    const saved = await dbOrders.add(vendorId, orderToSave);
    await loadVendorData();
    return saved;
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order["status"]) => {
    await dbOrders.updateStatus(vendorId, orderId, status);
    await loadVendorData();
  };

  // Repeat Previous Order Trigger
  const handleRepeatPreviousOrder = (items: OrderItem[], name?: string, phone?: string) => {
    setRepeatOrderItems({ items, customerName: name, customerPhone: phone });
    setActiveTab("new-order");
  };

  // Check if onboarding setup is pending
  if (vendorData && !vendorData.setupComplete) {
    return (
      <VendorSetup 
        vendorId={vendorId} 
        onSetupComplete={handleSetupComplete} 
        onLogout={logout} 
      />
    );
  }

  // Check if subscription has expired
  if (isLicenseExpired) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between items-center px-6 py-12 bg-gradient-to-tr from-[#1A0A0A] via-[#0E0606] to-[#250909] text-center">
        <div className="absolute top-[10%] w-[60%] h-[30%] rounded-full bg-red-600/10 blur-[100px] pointer-events-none" />
        
        <div className="my-auto max-w-md glass-card rounded-3xl p-8 border border-red-500/20 relative overflow-hidden space-y-6">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-red-600 animate-pulse" />
          
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertOctagon className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-red-400">Subscription Expired</h2>
            <p className="text-sm text-slate-300">
              Your license for PayFlow has expired or your vendor status has been suspended. Please contact the administrator to renew.
            </p>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-xs text-slate-400 font-semibold space-y-1">
            <div>Vendor ID: <span className="text-slate-200 font-bold">{vendorId}</span></div>
            <div>Expiry Date: <span className="text-red-400 font-bold">{vendorData?.subscriptionExpiry}</span></div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full max-w-xs py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold border border-white/10 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Exit Account</span>
        </button>
      </div>
    );
  }

  // Active theme layout class mapping
  const themeClassMap: Record<Vendor["theme"], string> = {
    "dark": "bg-gradient-to-tr from-[#0F172A] via-[#0B0F19] to-[#1E293B] text-slate-100",
    "light": "bg-gradient-to-tr from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] text-slate-900",
    "funky-purple": "bg-gradient-to-tr from-[#0F0C20] via-[#15102A] to-[#0A0518] text-slate-100",
    "funky-pink": "bg-gradient-to-tr from-[#1C0A1C] via-[#0E0613] to-[#25091C] text-slate-100",
    "funky-cyan": "bg-gradient-to-tr from-[#05151A] via-[#080E16] to-[#071F24] text-slate-100"
  };

  const getThemeClass = () => themeClassMap[vendorData?.theme] || themeClassMap["funky-purple"];

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between ${getThemeClass()} animate-mesh overflow-x-hidden relative`}>
      {/* Header Profile Summary */}
      <header className="w-full glass-panel border-b border-white/5 py-3.5 px-5 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {vendorData?.logoUrl ? (
            <img src={vendorData.logoUrl} alt={vendorData.businessName} className="w-8 h-8 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple-light">
              <Store className="w-4.5 h-4.5" />
            </div>
          )}
          <span className="font-extrabold text-sm tracking-wide text-slate-100 truncate max-w-[180px]">
            {vendorData?.businessName || "Vendor"}
          </span>
        </div>
        
        {/* Dynamic theme highlight tags */}
        <span className="text-[9px] font-black uppercase bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-slate-400">
          License Active
        </span>
      </header>

      {/* Main View Container */}
      <main className="flex-grow w-full max-w-md mx-auto px-4 mt-5 relative">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>Syncing local database records...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === "dashboard" && (
                <DashboardTab
                  orders={orders}
                  products={products}
                  currencySymbol={currencySymbol}
                  onNavigateToTab={setActiveTab}
                  onViewOrderDetails={setSelectedOrder}
                />
              )}
              {activeTab === "products" && (
                <ProductsTab
                  products={products}
                  currencySymbol={currencySymbol}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                />
              )}
              {activeTab === "new-order" && (
                <NewOrderTab
                  products={products}
                  vendorUpiId={vendorData.upiId}
                  vendorBusinessName={vendorData.businessName}
                  currencySymbol={currencySymbol}
                  onSaveOrder={handleSaveOrder}
                  onNavigateToTab={setActiveTab}
                  // Repeat order payload injected dynamically
                  key={repeatOrderItems ? "repeat" : "normal"}
                  // Provide state injectors if repeat order was triggered
                />
              )}
              {activeTab === "orders" && (
                <OrdersTab
                  orders={orders}
                  currencySymbol={currencySymbol}
                  onUpdateStatus={handleUpdateOrderStatus}
                  vendorBusinessName={vendorData.businessName}
                />
              )}
              {activeTab === "customers" && (
                <CustomersTab
                  orders={orders}
                  currencySymbol={currencySymbol}
                  onRepeatPreviousOrder={handleRepeatPreviousOrder}
                />
              )}
              {activeTab === "reports" && (
                <ReportsTab
                  orders={orders}
                  products={products}
                  currencySymbol={currencySymbol}
                />
              )}
              {activeTab === "settings" && (
                <SettingsTab
                  vendor={vendorData}
                  onLogout={logout}
                  onRefreshProfile={refreshProfile}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* GLOBAL ORDER DETAIL POPUP (IF WIDGET CLICKED) */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-end justify-center">
            <div className="absolute inset-0" onClick={() => setSelectedOrder(null)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-[#0D121F] border-t border-white/10 rounded-t-3xl p-6 space-y-5 z-10 safe-pb"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base text-slate-200">Order details: {selectedOrder.orderNumber}</h3>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{new Date(selectedOrder.date).toLocaleString()}</span>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              {/* Items List */}
              <div className="glass-card rounded-2xl border border-white/5 p-4 space-y-3.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Items Purchased</span>
                <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold truncate max-w-[70%]">{item.name} ×{item.quantity}</span>
                      <span className="text-slate-200 font-black">{currencySymbol}{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/5 pt-3.5 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between"><span>Subtotal</span><span>{currencySymbol}{selectedOrder.subtotal}</span></div>
                  {selectedOrder.discount > 0 && <div className="flex justify-between text-red-400"><span>Discount</span><span>-${currencySymbol}{selectedOrder.discount}</span></div>}
                  <div className="flex justify-between font-black text-slate-100 text-sm pt-1"><span>Grand Total</span><span className="text-brand-purple-light">{currencySymbol}{selectedOrder.grandTotal}</span></div>
                </div>
              </div>

              {/* Action details */}
              <div className="space-y-2.5">
                {selectedOrder.status === "pending" && (
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder.id, "paid");
                      setSelectedOrder(null);
                    }}
                    className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4.5 h-4.5" />
                    <span>Confirm as Paid</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    const detailsStr = `🍽 *${vendorData.businessName}*\nThank you for your order.\n\n*Total:* *${currencySymbol}${selectedOrder.grandTotal}*\nPay securely: ${selectedOrder.upiDeepLink}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(detailsStr)}`, "_blank");
                  }}
                  className="w-full py-4 bg-[#25D366] text-white font-extrabold rounded-2xl hover:brightness-105 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4.5 h-4.5" />
                  <span>Reshare on WhatsApp</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Sticky Navigation Menu (Thumb Friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto w-full glass-panel border-t border-white/5 py-2 px-3 z-40 safe-pb flex justify-between items-center text-slate-400 select-none print:hidden shadow-xl">
        
        {/* Dashboard */}
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-0.5 flex-grow py-1 rounded-xl transition-all ${
            activeTab === "dashboard" ? "text-brand-purple-light scale-105" : "hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-bold">Home</span>
        </button>

        {/* Product Menu */}
        <button 
          onClick={() => setActiveTab("products")}
          className={`flex flex-col items-center gap-0.5 flex-grow py-1 rounded-xl transition-all ${
            activeTab === "products" ? "text-brand-purple-light scale-105" : "hover:text-slate-200"
          }`}
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[9px] font-bold">Menu</span>
        </button>

        {/* Create Order (Large middle thumb FAB) */}
        <button 
          onClick={() => {
            setRepeatOrderItems(null); // clear repeat normal billing
            setActiveTab("new-order");
          }}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-full relative -top-3.5 transition-all shadow-lg border shrink-0 ${
            activeTab === "new-order"
              ? "bg-gradient-to-tr from-brand-purple to-brand-pink text-white border-brand-purple-light glow-purple scale-110"
              : "bg-[#0D121F] border-white/10 hover:border-white/20 hover:text-slate-200"
          }`}
        >
          <ShoppingBag className="w-5.5 h-5.5" />
        </button>

        {/* Orders list */}
        <button 
          onClick={() => setActiveTab("orders")}
          className={`flex flex-col items-center gap-0.5 flex-grow py-1 rounded-xl transition-all ${
            activeTab === "orders" ? "text-brand-purple-light scale-105" : "hover:text-slate-200"
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[9px] font-bold">Orders</span>
        </button>

        {/* Customers */}
        <button 
          onClick={() => setActiveTab("customers")}
          className={`flex flex-col items-center gap-0.5 flex-grow py-1 rounded-xl transition-all ${
            activeTab === "customers" ? "text-brand-purple-light scale-105" : "hover:text-slate-200"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold">Clients</span>
        </button>

        {/* Reports */}
        <button 
          onClick={() => setActiveTab("reports")}
          className={`flex flex-col items-center gap-0.5 flex-grow py-1 rounded-xl transition-all ${
            activeTab === "reports" ? "text-brand-purple-light scale-105" : "hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[9px] font-bold">Reports</span>
        </button>

        {/* Settings */}
        <button 
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center gap-0.5 flex-grow py-1 rounded-xl transition-all ${
            activeTab === "settings" ? "text-brand-purple-light scale-105" : "hover:text-slate-200"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold">Settings</span>
        </button>

      </nav>
    </div>
  );
};
