import React, { useState } from "react";
import type { Order } from "../../types";
import { Search, User, Clock, ChevronRight, X, Check, XOctagon, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OrdersTabProps {
  orders: Order[];
  currencySymbol: string;
  onUpdateStatus: (orderId: string, status: Order["status"]) => Promise<void>;
  vendorBusinessName: string;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  currencySymbol,
  onUpdateStatus,
  vendorBusinessName
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "cancelled">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.includes(searchQuery));
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (orderId: string, status: Order["status"]) => {
    try {
      await onUpdateStatus(orderId, status);
      // Update selected order in state if open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const getWhatsAppLink = (order: Order) => {
    let detailsStr = `🍽 *${vendorBusinessName}*\n`;
    detailsStr += `Thank you for your order.\n\n`;
    detailsStr += `*Order Details:*\n`;
    order.items.forEach(item => {
      detailsStr += `• ${item.name} ×${item.quantity} — ${currencySymbol}${item.price * item.quantity}\n`;
    });
    
    if (order.discount > 0) {
      detailsStr += `\n*Subtotal:* ${currencySymbol}${order.subtotal}\n`;
      detailsStr += `*Discount:* -${currencySymbol}${order.discount}\n`;
    }
    
    detailsStr += `\n*Total:* *${currencySymbol}${order.grandTotal}*\n\n`;
    detailsStr += `Tap below to pay securely via any UPI app:\n`;
    detailsStr += `${order.upiDeepLink}\n\n`;
    detailsStr += `Thank you for choosing us!`;

    const encodedText = encodeURIComponent(detailsStr);
    
    if (order.customerPhone) {
      let phone = order.customerPhone.replace(/\D/g, "");
      if (phone.length === 10) phone = "91" + phone;
      return `https://wa.me/${phone}?text=${encodedText}`;
    }
    
    return `https://wa.me/?text=${encodedText}`;
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search orders by number/phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-xs font-semibold focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 py-1">
          {(["all", "pending", "paid", "cancelled"] as const).map((filterOpt, idx) => (
            <button
              key={idx}
              onClick={() => setStatusFilter(filterOpt)}
              className={`flex-grow py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                statusFilter === filterOpt
                  ? filterOpt === "paid"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : filterOpt === "pending"
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : filterOpt === "cancelled"
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-brand-purple text-white border-brand-purple"
                  : "bg-white/5 text-slate-400 border-white/5"
              }`}
            >
              {filterOpt}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="glass-card rounded-2xl py-12 text-center text-slate-500 font-medium text-xs">
            No orders found matching filters.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <motion.div
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedOrder(order)}
              key={order.id}
              className="glass-card rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-200">{order.orderNumber}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    order.status === "paid" 
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : order.status === "pending"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>
                    {new Date(order.date).toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                    {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {order.customerPhone && (
                  <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>{order.customerName || "Customer"} ({order.customerPhone})</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-semibold">{currencySymbol}</span>
                  <span className="text-sm font-black text-slate-200 ml-0.5">{order.grandTotal}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* DETAIL OVERLAY SLIDE MODAL */}
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
                  <h3 className="font-extrabold text-base text-slate-200">
                    Order Details: {selectedOrder.orderNumber}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    {new Date(selectedOrder.date).toLocaleString()}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
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

                <div className="border-t border-white/5 pt-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span>{currencySymbol}{selectedOrder.subtotal}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-red-400">
                      <span>Discount</span>
                      <span>-${currencySymbol}{selectedOrder.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-slate-100 text-sm pt-1">
                    <span>Grand Total</span>
                    <span className="text-brand-purple-light">{currencySymbol}{selectedOrder.grandTotal}</span>
                  </div>
                </div>
              </div>

              {/* Customer info if exists */}
              {selectedOrder.customerPhone && (
                <div className="glass-card rounded-2xl border border-white/5 p-4 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Customer Details</span>
                  <div className="text-xs text-slate-300 font-semibold">{selectedOrder.customerName || "Anonymous"}</div>
                  <div className="text-xs text-slate-400 font-medium">{selectedOrder.customerPhone}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {selectedOrder.status === "pending" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, "paid")}
                      className="py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-green-500/10"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark as Paid</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, "cancelled")}
                      className="py-3.5 bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-950/60 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <XOctagon className="w-4 h-4" />
                      <span>Cancel Order</span>
                    </button>
                  </div>
                )}

                {selectedOrder.status !== "pending" && (
                  <div className="text-center py-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-semibold text-slate-400">
                    Order is finalized as <span className="font-bold text-slate-200 capitalize">{selectedOrder.status}</span>
                  </div>
                )}

                <button
                  onClick={() => window.open(getWhatsAppLink(selectedOrder), "_blank")}
                  className="w-full py-4 bg-[#25D366] text-white font-extrabold rounded-2xl hover:brightness-105 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4.5 h-4.5" />
                  <span>Reshare Invoice on WhatsApp</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
