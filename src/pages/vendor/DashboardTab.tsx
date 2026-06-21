import React from "react";
import type { Order, Product } from "../../types";
import { ShoppingBag, ArrowRight, TrendingUp, Calendar, CreditCard, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardTabProps {
  orders: Order[];
  products: Product[];
  currencySymbol: string;
  onNavigateToTab: (tab: string) => void;
  onViewOrderDetails: (order: Order) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  orders,
  currencySymbol,
  onNavigateToTab,
  onViewOrderDetails
}) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Filter orders
  const todayOrders = orders.filter(o => o.date.startsWith(todayStr));
  const paidTodayOrders = todayOrders.filter(o => o.status === "paid");
  
  const monthlyPaidOrders = orders.filter(o => 
    o.date.startsWith(currentMonthStr) && o.status === "paid"
  );

  // 1. Today's Sales
  const todaySales = paidTodayOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  // 2. Today's Orders Count
  const todayOrdersCount = todayOrders.length;

  // 3. Monthly Sales
  const monthlySales = monthlyPaidOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  // 4. Calculate Frequently Sold Products
  const productQuantities: Record<string, { name: string; qty: number; revenue: number }> = {};
  
  // Aggregate from paid orders
  orders
    .filter(o => o.status === "paid")
    .forEach(order => {
      order.items.forEach(item => {
        if (!productQuantities[item.productId]) {
          productQuantities[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        }
        productQuantities[item.productId].qty += item.quantity;
        productQuantities[item.productId].revenue += item.price * item.quantity;
      });
    });

  const sortedProducts = Object.values(productQuantities).sort((a, b) => b.qty - a.qty);
  const topSellingProduct = sortedProducts[0] || null;
  const frequentlySold = sortedProducts.slice(0, 4);

  // Recent Orders (last 5)
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      {/* Welcome Banner / Quick Order Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-3xl p-6 relative overflow-hidden border border-brand-purple/20 shadow-xl shadow-brand-purple/5"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-purple-light" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Insta-Pay Flow</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Create Order & Share Payment</h3>
            <p className="text-xs text-slate-400 mt-1">Send a UPI deep link to customers via WhatsApp in under 15 seconds.</p>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateToTab("new-order")}
            className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-2xl glow-purple hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Create New Order</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-3 gap-3">
        {/* Today's Sales */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-3 border border-white/5 flex flex-col justify-between"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Sales</span>
          <div className="mt-2">
            <span className="text-sm font-semibold text-slate-400">{currencySymbol}</span>
            <span className="text-lg font-black text-slate-200 ml-0.5">{todaySales.toLocaleString()}</span>
          </div>
          <TrendingUp className="w-3.5 h-3.5 text-brand-purple-light mt-2" />
        </motion.div>

        {/* Today's Orders */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-3 border border-white/5 flex flex-col justify-between"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Orders</span>
          <div className="mt-2">
            <span className="text-lg font-black text-slate-200">{todayOrdersCount}</span>
          </div>
          <Calendar className="w-3.5 h-3.5 text-brand-cyan-light mt-2" />
        </motion.div>

        {/* Monthly Sales */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-3 border border-white/5 flex flex-col justify-between"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Sales</span>
          <div className="mt-2">
            <span className="text-sm font-semibold text-slate-400">{currencySymbol}</span>
            <span className="text-lg font-black text-slate-200 ml-0.5">{monthlySales.toLocaleString()}</span>
          </div>
          <CreditCard className="w-3.5 h-3.5 text-brand-pink-light mt-2" />
        </motion.div>
      </div>

      {/* Analytics Insight Quick Widget */}
      {topSellingProduct && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-4 border border-white/5 flex items-center justify-between"
        >
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Top Selling Product</span>
            <span className="font-bold text-sm text-slate-200 block mt-0.5">{topSellingProduct.name}</span>
            <span className="text-xs text-slate-400 mt-0.5 block">{topSellingProduct.qty} sold this month</span>
          </div>
          <div className="bg-brand-cyan/10 border border-brand-cyan/20 p-2.5 rounded-xl text-brand-cyan-light">
            <TrendingUp className="w-5 h-5" />
          </div>
        </motion.div>
      )}

      {/* Recent Orders Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-bold text-sm text-slate-300">Recent Orders</h4>
          <button 
            onClick={() => onNavigateToTab("orders")}
            className="text-xs text-brand-purple-light hover:underline font-semibold flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {recentOrders.length === 0 ? (
            <div className="glass-card rounded-2xl py-8 text-center text-slate-500 font-medium text-xs">
              No orders registered yet.
            </div>
          ) : (
            recentOrders.map((order) => (
              <motion.div
                whileTap={{ scale: 0.99 }}
                onClick={() => onViewOrderDetails(order)}
                key={order.id}
                className="glass-card rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-200">{order.orderNumber}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      order.status === "paid" 
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : order.status === "pending"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.items.length} items
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold">{currencySymbol}</span>
                  <span className="text-sm font-black text-slate-200 ml-0.5">{order.grandTotal}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Frequently Sold Products grid */}
      {frequentlySold.length > 0 && (
        <section className="space-y-3">
          <h4 className="font-bold text-sm text-slate-300 px-1">Frequently Sold Items</h4>
          <div className="grid grid-cols-2 gap-3">
            {frequentlySold.map((prod, idx) => (
              <div key={idx} className="glass-card rounded-2xl p-3 border border-white/5 space-y-1">
                <span className="text-xs font-bold text-slate-300 block truncate">{prod.name}</span>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>{prod.qty} orders</span>
                  <span className="font-bold text-brand-purple-light">{currencySymbol}{prod.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
