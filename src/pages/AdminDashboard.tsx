import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { dbAdmin, dbAnnouncements } from "../services/db";
import type { Vendor, PlatformStats } from "../types";
import { 
  LogOut, Plus, Search, Trash2, ShieldAlert, CheckCircle, 
  XCircle, Send, Key, Calendar, BarChart3, Users, DollarSign, AlertTriangle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [stats, setStats] = useState<PlatformStats>({
    totalRevenue: 0,
    totalVendors: 0,
    activeVendors: 0,
    expiredVendors: 0
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Forms states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVendorId, setNewVendorId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newExpiry, setNewExpiry] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1); // default 1 month
    return d.toISOString().split("T")[0];
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Announcement Form
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annSuccess, setAnnSuccess] = useState(false);

  // Password reset/Renewal modal states
  const [resettingVendor, setResettingVendor] = useState<Vendor | null>(null);
  const [resetPassVal, setResetPassVal] = useState("");
  
  const [renewingVendor, setRenewingVendor] = useState<Vendor | null>(null);
  const [renewDateVal, setRenewDateVal] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dataStats = await dbAdmin.getPlatformStats();
      const list = await dbAdmin.getVendors();
      setStats(dataStats);
      setVendors(list);
    } catch (err) {
      console.error("Failed to load platform data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newVendorId.trim() || !newPassword.trim() || !newExpiry) {
      setCreateError("Please fill in all fields.");
      return;
    }

    try {
      await dbAdmin.createVendor(newVendorId, newPassword, newExpiry);
      setShowCreateModal(false);
      setNewVendorId("");
      setNewPassword("");
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create vendor.");
    }
  };

  const handleToggleStatus = async (vendor: Vendor) => {
    const nextStatus = vendor.status === "active" ? "suspended" : "active";
    try {
      await dbAdmin.updateVendor(vendor.id, { status: nextStatus as any });
      await loadData();
    } catch (err) {
      console.error("Failed to toggle vendor status:", err);
    }
  };

  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingVendor || !renewDateVal) return;

    try {
      await dbAdmin.updateVendor(renewingVendor.id, { subscriptionExpiry: renewDateVal });
      setRenewingVendor(null);
      await loadData();
    } catch (err) {
      console.error("Failed to renew subscription:", err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingVendor || !resetPassVal.trim()) return;

    try {
      await dbAdmin.resetPassword(resettingVendor.id, resetPassVal);
      setResettingVendor(null);
      setResetPassVal("");
      alert("Password updated successfully!");
    } catch (err) {
      console.error("Failed to reset password:", err);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete Vendor: ${vendorId}? This will remove all their products and orders permanently!`)) {
      return;
    }

    try {
      await dbAdmin.deleteVendor(vendorId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete vendor:", err);
    }
  };

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    try {
      await dbAnnouncements.broadcast(annTitle, annContent);
      setAnnTitle("");
      setAnnContent("");
      setAnnSuccess(true);
      setTimeout(() => setAnnSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to broadcast announcement:", err);
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      {/* Top Header */}
      <header className="w-full glass-panel border-b border-white/5 py-4 px-6 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-brand-purple-light" />
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-brand-purple-light to-brand-pink-light bg-clip-text text-transparent">
            PAYFLOW ADMIN
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 active:scale-95 px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-white/10"
        >
          <LogOut className="w-4 h-4 text-brand-pink-light" />
          <span>Logout</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 mt-8 space-y-8 flex-grow">
        
        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-brand-cyan-light">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform Revenue</span>
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-100">₹{stats.totalRevenue.toLocaleString()}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-brand-purple-light">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Vendors</span>
              <Users className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-100">{stats.totalVendors}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-5 border border-green-500/10 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-green-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Licenses</span>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-100">{stats.activeVendors}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card rounded-2xl p-5 border border-red-500/10 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-red-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expired / Suspended</span>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-100">{stats.expiredVendors}</span>
            </div>
          </motion.div>
        </section>

        {/* Vendors Management Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-purple" />
              <span>Manage SaaS Vendors</span>
            </h2>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-purple transition-all"
                />
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-brand-purple to-brand-pink hover:brightness-110 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-brand-purple/20 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create Vendor</span>
              </button>
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span>Loading vendors database...</span>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-medium">
                No vendors found in database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-4 px-6">Vendor ID / Business</th>
                      <th className="py-4 px-6">WhatsApp / UPI</th>
                      <th className="py-4 px-6">Expiry Date</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredVendors.map((vendor) => {
                      const isExpired = vendor.subscriptionExpiry < todayStr;
                      return (
                        <tr key={vendor.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-200">{vendor.id}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{vendor.businessName || "Pending First Setup"}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-slate-300">{vendor.whatsAppNumber || "—"}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{vendor.upiId || "—"}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className={`font-semibold ${isExpired ? "text-red-400" : "text-slate-300"}`}>
                              {vendor.subscriptionExpiry}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{isExpired ? "Expired" : "Active License"}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              vendor.status === "active" && !isExpired 
                                ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {vendor.status === "active" && !isExpired ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>{vendor.status === "suspended" ? "Suspended" : "Expired"}</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleStatus(vendor)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                  vendor.status === "active"
                                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20"
                                    : "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20"
                                }`}
                              >
                                {vendor.status === "active" ? "Suspend" : "Activate"}
                              </button>
                              
                              <button
                                onClick={() => {
                                  setRenewingVendor(vendor);
                                  setRenewDateVal(vendor.subscriptionExpiry);
                                }}
                                title="Renew License"
                                className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-purple-light border border-white/5 transition-all"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setResettingVendor(vendor);
                                }}
                                title="Reset Password"
                                className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-cyan-light border border-white/5 transition-all"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteVendor(vendor.id)}
                                title="Delete Vendor"
                                className="p-2 bg-red-950/20 hover:bg-red-950/50 rounded-lg text-red-400 border border-red-500/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Announcements Panel & Platform Configuration */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Broadcast Announcement */}
          <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2 text-brand-pink-light">
              <Send className="w-5 h-5" />
              <span>Broadcast Announcement</span>
            </h3>
            <p className="text-xs text-slate-400">
              This message will display on the login page immediately for all active and prospective vendors.
            </p>
            <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Announcement Title</label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Scheduled Maintenance"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-brand-pink transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Content</label>
                <textarea
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={3}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-brand-pink transition-all resize-none"
                />
              </div>
              
              <AnimatePresence>
                {annSuccess && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs font-semibold text-green-400 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Announcement broadcasted successfully!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast System Announcement</span>
              </button>
            </form>
          </div>

          {/* Quick Platform Guidelines */}
          <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-4">
            <h3 className="font-bold text-lg text-brand-cyan-light flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              <span>Admin System Guidelines</span>
            </h3>
            <div className="text-xs text-slate-400 space-y-3 leading-relaxed">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="font-bold text-slate-300 block mb-1">Subscriptions Model</span>
                When a Vendor's subscription expires, they can still login but cannot create any new orders or generate payment links. A persistent blocker screen informs them to contact the admin.
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="font-bold text-slate-300 block mb-1">Credential Security</span>
                Default credentials must be updated manually. Vendors have NO direct 'Forgot Password' flow. They must contact you as the Super Admin to request a password reset.
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="font-bold text-slate-300 block mb-1">Database Isolation</span>
                Deleting a vendor removes their account credentials, products collections, and history from the platform. Use suspend instead to restrict temporary access without losing records.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* CREATE VENDOR MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden relative"
            >
              <div className="h-1 bg-gradient-to-r from-brand-purple to-brand-pink" />
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-200">Register New SaaS Vendor</h3>
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
                
                {createError && (
                  <div className="text-xs p-2.5 bg-red-950/40 border border-red-500/20 text-red-200 rounded-xl flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>{createError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateVendor} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vendor ID (Unique ID)</label>
                    <input
                      type="text"
                      placeholder="e.g. VEND103"
                      value={newVendorId}
                      onChange={(e) => setNewVendorId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-purple"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Initial Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-purple"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subscription Expiry Date</label>
                    <input
                      type="date"
                      value={newExpiry}
                      onChange={(e) => setNewExpiry(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-purple"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all text-sm mt-2"
                  >
                    Register Vendor Account
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENEW LICENSE MODAL */}
      <AnimatePresence>
        {renewingVendor && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden relative"
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-200">Extend Subscription License</h3>
                  <button 
                    onClick={() => setRenewingVendor(null)}
                    className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Update license expiry for Vendor <span className="font-bold text-slate-200">{renewingVendor.id}</span>.
                </p>

                <form onSubmit={handleRenewSubscription} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expiry Date</label>
                    <input
                      type="date"
                      value={renewDateVal}
                      onChange={(e) => setRenewDateVal(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-purple"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(renewDateVal || new Date());
                        d.setMonth(d.getMonth() + 1);
                        setRenewDateVal(d.toISOString().split("T")[0]);
                      }}
                      className="flex-grow py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg"
                    >
                      +1 Month
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(renewDateVal || new Date());
                        d.setMonth(d.getMonth() + 3);
                        setRenewDateVal(d.toISOString().split("T")[0]);
                      }}
                      className="flex-grow py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg"
                    >
                      +3 Months
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(renewDateVal || new Date());
                        d.setMonth(d.getMonth() + 12);
                        setRenewDateVal(d.toISOString().split("T")[0]);
                      }}
                      className="flex-grow py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg"
                    >
                      +1 Year
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all text-sm"
                  >
                    Save Expiry Extensions
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESET PASSWORD MODAL */}
      <AnimatePresence>
        {resettingVendor && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden relative"
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-200">Force Reset Password</h3>
                  <button 
                    onClick={() => setResettingVendor(null)}
                    className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Update account password for Vendor <span className="font-bold text-slate-200">{resettingVendor.id}</span>.
                </p>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={resetPassVal}
                      onChange={(e) => setResetPassVal(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-purple"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all text-sm"
                  >
                    Overwrite Password
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
