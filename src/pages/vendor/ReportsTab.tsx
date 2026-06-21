import React, { useState } from "react";
import type { Order, Product } from "../../types";
import { BarChart3, FileText, Download, Printer, TrendingUp, ShoppingBag } from "lucide-react";

interface ReportsTabProps {
  orders: Order[];
  products: Product[];
  currencySymbol: string;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ orders, products, currencySymbol }) => {
  const [activeReportTab, setActiveReportTab] = useState<"analytics" | "data">("analytics");
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

  const paidOrders = orders.filter(o => o.status === "paid");

  // ==========================================
  // CALCULATE METRICS
  // ==========================================
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalOrdersCount = paidOrders.length;
  const aov = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Products aggregate
  const productStats: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
  paidOrders.forEach(order => {
    order.items.forEach(item => {
      // Find category in products if possible
      const pInfo = products.find(p => p.id === item.productId);
      const category = pInfo?.category || "Other";

      if (!productStats[item.productId]) {
        productStats[item.productId] = { name: item.name, qty: 0, revenue: 0, category };
      }
      productStats[item.productId].qty += item.quantity;
      productStats[item.productId].revenue += item.price * item.quantity;
    });
  });

  const sortedByQty = Object.values(productStats).sort((a, b) => b.qty - a.qty);
  const sortedByRev = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

  const highestSellingProduct = sortedByQty[0]?.name || "—";
  const lowestSellingProduct = sortedByQty.length > 0 ? sortedByQty[sortedByQty.length - 1].name : "—";
  const highestRevenueProduct = sortedByRev[0]?.name || "—";
  const mostOrderedProduct = highestSellingProduct;

  // Categories aggregate
  const categoryStats: Record<string, number> = {};
  Object.values(productStats).forEach(p => {
    categoryStats[p.category] = (categoryStats[p.category] || 0) + p.revenue;
  });
  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
  const bestSellingCategory = sortedCategories[0]?.[0] || "—";

  // Customers aggregate (Top 10)
  const customerStatsMap: Record<string, { name: string; phone: string; orders: number; spend: number }> = {};
  paidOrders.forEach(order => {
    if (!order.customerPhone) return;
    const phone = order.customerPhone.trim();
    if (!customerStatsMap[phone]) {
      customerStatsMap[phone] = { name: order.customerName || "Customer", phone, orders: 0, spend: 0 };
    }
    customerStatsMap[phone].orders += 1;
    customerStatsMap[phone].spend += order.grandTotal;
  });
  const top10Customers = Object.values(customerStatsMap)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);

  // Peak sales hours
  const hourCounts: Record<number, number> = {};
  paidOrders.forEach(order => {
    const hour = new Date(order.date).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
  const peakHourRaw = sortedHours[0]?.[0] ? parseInt(sortedHours[0][0]) : null;
  const peakSalesHours = peakHourRaw !== null 
    ? `${peakHourRaw === 0 ? 12 : peakHourRaw > 12 ? peakHourRaw - 12 : peakHourRaw} ${peakHourRaw >= 12 ? "PM" : "AM"}`
    : "—";

  // ==========================================
  // CHART DATA GENERATORS
  // ==========================================

  // Daily Chart (Last 7 Days)
  const getDailyChartData = () => {
    const data: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const sum = paidOrders
        .filter(o => o.date.startsWith(dateStr))
        .reduce((s, o) => s + o.grandTotal, 0);
      
      data.push({
        label: d.toLocaleDateString([], { weekday: "short" }),
        value: sum
      });
    }
    return data;
  };

  // Weekly Chart (Last 4 Weeks)
  const getWeeklyChartData = () => {
    const data: { label: string; value: number }[] = [];
    const today = new Date();
    for (let w = 3; w >= 0; w--) {
      const end = new Date(today.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const sum = paidOrders
        .filter(o => {
          const oTime = new Date(o.date).getTime();
          return oTime >= start.getTime() && oTime <= end.getTime();
        })
        .reduce((s, o) => s + o.grandTotal, 0);

      data.push({
        label: `Wk -${w}`,
        value: sum
      });
    }
    return data;
  };

  // Monthly Chart (Last 6 Months)
  const getMonthlyChartData = () => {
    const data: { label: string; value: number }[] = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
      const sum = paidOrders
        .filter(o => o.date.startsWith(monthStr))
        .reduce((s, o) => s + o.grandTotal, 0);

      data.push({
        label: d.toLocaleDateString([], { month: "short" }),
        value: sum
      });
    }
    return data;
  };

  // Customer Growth Chart (Cumulative active phone counts over last 6 months)
  const getCustomerGrowthData = () => {
    const data: { label: string; value: number }[] = [];
    const uniquePhones = new Set<string>();
    
    // We fetch chronologically
    const cronOrders = [...paidOrders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Create 6 monthly nodes
    for (let m = 5; m >= 0; m--) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      d.setDate(31); // end of month
      const limitTime = d.getTime();

      cronOrders.forEach(o => {
        if (new Date(o.date).getTime() <= limitTime && o.customerPhone) {
          uniquePhones.add(o.customerPhone.trim());
        }
      });

      data.push({
        label: d.toLocaleDateString([], { month: "short" }),
        value: uniquePhones.size
      });
    }
    return data;
  };

  const chartData = 
    timeframe === "daily" ? getDailyChartData() :
    timeframe === "weekly" ? getWeeklyChartData() :
    getMonthlyChartData();

  const maxChartValue = Math.max(...chartData.map(d => d.value), 100);

  // ==========================================
  // EXPORT UTILITIES
  // ==========================================

  const handleExportCSV = () => {
    // Generate CSV contents of all orders
    let csv = "Order Number,Date,Customer Name,Customer Phone,Items Count,Subtotal,Discount,Grand Total,Status\n";
    orders.forEach(o => {
      const escapedName = (o.customerName || "").replace(/"/g, '""');
      const itemsCount = o.items.reduce((s, i) => s + i.quantity, 0);
      csv += `${o.orderNumber},${o.date.split("T")[0]},"${escapedName}",${o.customerPhone || ""},${itemsCount},${o.subtotal},${o.discount},${o.grandTotal},${o.status}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payflow_sales_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-24 print:bg-white print:text-black print:pb-0">
      
      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-white/5 pb-2 print:hidden">
        <button
          onClick={() => setActiveReportTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeReportTab === "analytics"
              ? "border-brand-purple text-brand-purple-light"
              : "border-transparent text-slate-400"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics Charts</span>
        </button>
        
        <button
          onClick={() => setActiveReportTab("data")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeReportTab === "data"
              ? "border-brand-purple text-brand-purple-light"
              : "border-transparent text-slate-400"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Reports & Data</span>
        </button>
      </div>

      {/* ==========================================
          ANALYTICS TAB
          ========================================== */}
      {activeReportTab === "analytics" && (
        <div className="space-y-6">
          
          {/* Headline Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Average Order Value (AOV)</span>
              <div className="text-xl font-black text-slate-200">
                {currencySymbol}{aov.toLocaleString()}
              </div>
              <span className="text-[9px] text-slate-400 font-semibold block">per checkout invoice</span>
            </div>
            
            <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Best Category</span>
              <div className="text-xl font-black text-slate-200 truncate">
                {bestSellingCategory}
              </div>
              <span className="text-[9px] text-slate-400 font-semibold block">highest earning catalog</span>
            </div>
          </div>

          {/* Revenue Chart Section */}
          <div className="glass-card rounded-3xl p-5 border border-white/5 space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <h4 className="font-bold text-sm text-slate-300">Revenue Flow Graph</h4>
              
              <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                {(["daily", "weekly", "monthly"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setTimeframe(opt)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide transition-all ${
                      timeframe === opt
                        ? "bg-brand-purple text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-44 w-full flex items-end justify-between pt-4 pb-2 px-1 relative">
              {/* Y Axis line guides */}
              <div className="absolute inset-x-0 top-4 border-t border-white/5" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-white/5" />
              <div className="absolute inset-x-0 bottom-8 border-t border-white/5" />

              {chartData.map((d, i) => {
                const percent = (d.value / maxChartValue) * 100;
                return (
                  <div key={i} className="flex-grow flex flex-col items-center justify-end h-full gap-2 relative z-10">
                    <span className="text-[8px] font-black text-slate-400">{currencySymbol}{d.value}</span>
                    <div 
                      style={{ height: `${Math.max(8, percent)}%` }}
                      className="w-8 bg-gradient-to-t from-brand-purple to-brand-pink rounded-t-lg glow-purple"
                    />
                    <span className="text-[9px] font-bold text-slate-500 mt-1">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Growth Graph */}
          <div className="glass-card rounded-3xl p-5 border border-white/5 space-y-4">
            <h4 className="font-bold text-sm text-slate-300">Customer Base Growth</h4>
            <p className="text-[10px] text-slate-500 font-medium">Cumulative growth of unique contacts over the last 6 months.</p>
            
            <div className="h-32 w-full flex items-end justify-between pt-4 pb-2 px-1 relative">
              {getCustomerGrowthData().map((d, i, arr) => {
                const maxVal = Math.max(...arr.map(x => x.value), 5);
                const percent = (d.value / maxVal) * 100;
                return (
                  <div key={i} className="flex-grow flex flex-col items-center justify-end h-full gap-1">
                    <span className="text-[9px] font-black text-brand-cyan-light">{d.value}</span>
                    <div 
                      style={{ height: `${Math.max(10, percent)}%` }}
                      className="w-6 bg-brand-cyan/20 border-t border-x border-brand-cyan rounded-t-md glow-cyan"
                    />
                    <span className="text-[9px] font-bold text-slate-500 mt-1">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Product Insights grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales Volume insights */}
            <div className="glass-card rounded-3xl p-5 border border-white/5 space-y-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-brand-purple-light" />
                <span>Sales volume insights</span>
              </span>
              <div className="text-[11px] space-y-2.5">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-semibold">Highest Selling Item</span>
                  <span className="text-slate-200 font-bold">{highestSellingProduct}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-semibold">Lowest Selling Item</span>
                  <span className="text-slate-200 font-bold">{lowestSellingProduct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Most Ordered Item</span>
                  <span className="text-slate-200 font-bold">{mostOrderedProduct}</span>
                </div>
              </div>
            </div>

            {/* Financial Performance insights */}
            <div className="glass-card rounded-3xl p-5 border border-white/5 space-y-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-pink-light" />
                <span>Revenue Insights</span>
              </span>
              <div className="text-[11px] space-y-2.5">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-semibold">Highest Revenue Item</span>
                  <span className="text-slate-200 font-bold">{highestRevenueProduct}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 font-semibold">Peak Sales Hour</span>
                  <span className="text-slate-200 font-bold">{peakSalesHours}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Best Performing Category</span>
                  <span className="text-slate-200 font-bold">{bestSellingCategory}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          REPORTS & DATA TAB
          ========================================== */}
      {activeReportTab === "data" && (
        <div className="space-y-6">
          
          {/* Actions Row */}
          <div className="flex gap-3 print:hidden">
            <button
              onClick={handleExportCSV}
              className="flex-grow py-3.5 bg-slate-900 border border-white/10 rounded-2xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV (Excel)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-grow py-3.5 bg-brand-purple text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-brand-purple/10"
            >
              <Printer className="w-4 h-4" />
              <span>Print/Export PDF</span>
            </button>
          </div>

          {/* Revenue by Product table */}
          <div className="glass-card rounded-3xl p-5 border border-white/5 space-y-4">
            <h4 className="font-bold text-sm text-slate-300">Revenue by Product</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 pb-2 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2">Product Name</th>
                    <th className="py-2">Category</th>
                    <th className="py-2 text-center">Qty Sold</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedByRev.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">No product sales logged.</td>
                    </tr>
                  ) : (
                    sortedByRev.map((p, idx) => (
                      <tr key={idx} className="text-slate-300">
                        <td className="py-2.5 font-bold">{p.name}</td>
                        <td className="py-2.5">{p.category}</td>
                        <td className="py-2.5 text-center font-semibold">{p.qty}</td>
                        <td className="py-2.5 text-right font-bold text-brand-purple-light">{currencySymbol}{p.revenue.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Customers table */}
          <div className="glass-card rounded-3xl p-5 border border-white/5 space-y-4">
            <h4 className="font-bold text-sm text-slate-300">Top 10 Customers</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 pb-2 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2">Customer Phone</th>
                    <th className="py-2">Name</th>
                    <th className="py-2 text-center">Orders</th>
                    <th className="py-2 text-right">Total Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {top10Customers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">No customer profiles found.</td>
                    </tr>
                  ) : (
                    top10Customers.map((cust, idx) => (
                      <tr key={idx} className="text-slate-300">
                        <td className="py-2.5 font-semibold">{cust.phone}</td>
                        <td className="py-2.5 font-bold">{cust.name}</td>
                        <td className="py-2.5 text-center">{cust.orders}</td>
                        <td className="py-2.5 text-right font-bold text-brand-pink-light">{currencySymbol}{cust.spend.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
