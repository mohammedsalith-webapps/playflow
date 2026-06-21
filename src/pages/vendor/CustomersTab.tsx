import React, { useState } from "react";
import type { Order, OrderItem } from "../../types";
import { Search, User, Phone, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

interface CustomersTabProps {
  orders: Order[];
  currencySymbol: string;
  onRepeatPreviousOrder: (items: OrderItem[], name?: string, phone?: string) => void;
}

interface CustomerRecord {
  phone: string;
  name: string;
  totalOrders: number;
  totalSpend: number;
  lastOrderDate: string;
  favouriteProduct: string;
  lastOrderItems: OrderItem[];
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  orders,
  currencySymbol,
  onRepeatPreviousOrder
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Aggregate customer records from orders
  const computeCustomerRecords = (): CustomerRecord[] => {
    const records: Record<string, {
      phone: string;
      name: string;
      totalOrders: number;
      totalSpend: number;
      lastOrderDate: string;
      productQuantities: Record<string, { name: string; qty: number }>;
      lastOrderItems: OrderItem[];
    }> = {};

    // Process from oldest to newest to ensure lastOrderDate is correct
    const sortedTimeline = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTimeline.forEach(order => {
      if (!order.customerPhone) return; // skip anonymous orders without phone
      const phone = order.customerPhone.trim();
      const name = order.customerName?.trim() || "";

      if (!records[phone]) {
        records[phone] = {
          phone,
          name,
          totalOrders: 0,
          totalSpend: 0,
          lastOrderDate: "",
          productQuantities: {},
          lastOrderItems: []
        };
      }

      const rec = records[phone];
      // Update name if a newer one is provided
      if (name) rec.name = name;
      
      // Update stats if paid or pending
      if (order.status === "paid") {
        rec.totalSpend += order.grandTotal;
      }
      
      if (order.status !== "cancelled") {
        rec.totalOrders += 1;
        rec.lastOrderDate = order.date;
        rec.lastOrderItems = order.items;

        order.items.forEach(item => {
          if (!rec.productQuantities[item.productId]) {
            rec.productQuantities[item.productId] = { name: item.name, qty: 0 };
          }
          rec.productQuantities[item.productId].qty += item.quantity;
        });
      }
    });

    // Format records and compute favorite product
    return Object.values(records).map(rec => {
      // Find item with highest quantity
      let favProduct = "—";
      let maxQty = 0;
      Object.values(rec.productQuantities).forEach(p => {
        if (p.qty > maxQty) {
          maxQty = p.qty;
          favProduct = p.name;
        }
      });

      return {
        phone: rec.phone,
        name: rec.name || "Regular Customer",
        totalOrders: rec.totalOrders,
        totalSpend: rec.totalSpend,
        lastOrderDate: rec.lastOrderDate,
        favouriteProduct: favProduct,
        lastOrderItems: rec.lastOrderItems
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend); // sort by spend
  };

  const customerRecords = computeCustomerRecords();

  const filteredCustomers = customerRecords.filter(c => 
    c.phone.includes(searchQuery) || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.favouriteProduct.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search customer by name/phone/item..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-xs font-semibold focus:outline-none"
        />
      </div>

      {/* Customer Cards List */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="glass-card rounded-2xl py-12 text-center text-slate-500 font-medium text-xs">
            No customer profiles registered.
          </div>
        ) : (
          filteredCustomers.map((cust, idx) => (
            <motion.div
              layout
              key={idx}
              className="glass-card rounded-2xl p-4 border border-white/5 space-y-4"
            >
              {/* Top Header Card */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple-light">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-200 block">{cust.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{cust.phone}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Total Spent</span>
                  <span className="text-xs font-black text-slate-200 block">
                    {currencySymbol}{cust.totalSpend.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Middle Stats List */}
              <div className="grid grid-cols-2 gap-2 bg-white/[0.01] border border-white/5 p-3 rounded-xl text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold block uppercase tracking-wider">Total Orders</span>
                  <span className="text-slate-300 font-black mt-0.5 block">{cust.totalOrders} Bills</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase tracking-wider">Favorite Item</span>
                  <span className="text-slate-300 font-black mt-0.5 block truncate max-w-[130px]">{cust.favouriteProduct}</span>
                </div>
              </div>

              {/* Bottom Quick repeat order action */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3.5">
                <span className="text-[9px] text-slate-400 font-medium">
                  Last purchase: {cust.lastOrderDate ? new Date(cust.lastOrderDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </span>
                
                {cust.lastOrderItems.length > 0 && (
                  <button
                    onClick={() => onRepeatPreviousOrder(cust.lastOrderItems, cust.name, cust.phone)}
                    className="flex items-center gap-1.5 bg-brand-purple/10 border border-brand-purple/20 hover:bg-brand-purple/20 text-brand-purple-light text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Repeat Order</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
