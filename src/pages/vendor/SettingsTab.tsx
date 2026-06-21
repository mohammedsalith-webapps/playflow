import React, { useState } from "react";
import type { Vendor } from "../../types";
import { dbVendor } from "../../services/db";
import { Store, Palette, Coins, LogOut, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SettingsTabProps {
  vendor: Vendor;
  onLogout: () => void;
  onRefreshProfile: () => void;
}

const THEME_OPTIONS: { id: Vendor["theme"]; name: string; class: string }[] = [
  { id: "dark", name: "Slate Dark", class: "bg-slate-900 border-slate-700 text-slate-100" },
  { id: "light", name: "Pristine Light", class: "bg-slate-50 border-slate-200 text-slate-900" },
  { id: "funky-purple", name: "Neon Violet", class: "bg-gradient-to-r from-violet-950 to-indigo-950 border-violet-800 text-slate-100 glow-purple" },
  { id: "funky-pink", name: "Hot Pink", class: "bg-gradient-to-r from-fuchsia-950 to-rose-950 border-fuchsia-800 text-slate-100 glow-pink" },
  { id: "funky-cyan", name: "Neon Teal", class: "bg-gradient-to-r from-cyan-950 to-emerald-950 border-cyan-800 text-slate-100 glow-cyan" }
];

const CURRENCIES = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "AED", symbol: "د.إ" }
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  vendor,
  onLogout,
  onRefreshProfile
}) => {
  const [businessName, setBusinessName] = useState(vendor.businessName);
  const [upiId, setUpiId] = useState(vendor.upiId);
  const [whatsAppNumber, setWhatsAppNumber] = useState(vendor.whatsAppNumber);
  const [logoUrl, setLogoUrl] = useState(vendor.logoUrl || "");
  
  const [activeTheme, setActiveTheme] = useState<Vendor["theme"]>(vendor.theme);
  const [activeCurrency, setActiveCurrency] = useState(vendor.currency);

  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    if (!businessName.trim() || !upiId.trim() || !whatsAppNumber.trim()) {
      setError("Business Name, UPI ID, and WhatsApp Number are required.");
      return;
    }

    let formattedPhone = whatsAppNumber.replace(/\D/g, "");
    if (formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    } else if (formattedPhone.length < 10) {
      setError("Please check your WhatsApp phone number.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update basic profile
      await dbVendor.updateSetup(vendor.id, {
        businessName: businessName.trim(),
        upiId: upiId.trim(),
        whatsAppNumber: formattedPhone,
        logoUrl: logoUrl.trim() || undefined
      });

      // 2. Update theme & currency if modified
      if (activeTheme !== vendor.theme) {
        await dbVendor.updateTheme(vendor.id, activeTheme);
      }
      if (activeCurrency !== vendor.currency) {
        await dbVendor.updateCurrency(vendor.id, activeCurrency);
      }

      onRefreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeSelect = async (themeId: Vendor["theme"]) => {
    setActiveTheme(themeId);
  };

  const handleCurrencySelect = (code: string) => {
    setActiveCurrency(code);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Settings Form */}
      <div className="glass-card rounded-3xl p-5 border border-white/5 space-y-4">
        <h3 className="font-extrabold text-sm text-slate-300 flex items-center gap-2">
          <Store className="w-4.5 h-4.5 text-brand-purple-light" />
          <span>Business Profile</span>
        </h3>

        {error && (
          <div className="text-xs p-2.5 bg-red-950/40 border border-red-500/20 text-red-200 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">UPI Address</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">WhatsApp Number</label>
              <input
                type="tel"
                value={whatsAppNumber}
                onChange={(e) => setWhatsAppNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            />
          </div>

          {/* Theme Selector */}
          <div className="space-y-2 border-t border-white/5 pt-4">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-brand-pink-light" />
              <span>SaaS UI Theme (Funky Colors)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all text-center ${theme.class} ${
                    activeTheme === theme.id 
                      ? "ring-2 ring-brand-purple ring-offset-2 ring-offset-slate-950 scale-[1.02]" 
                      : "opacity-60"
                  }`}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          {/* Currency Selector */}
          <div className="space-y-2 border-t border-white/5 pt-4">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-brand-cyan-light" />
              <span>Currency Settings</span>
            </label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
              {CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => handleCurrencySelect(curr.code)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shrink-0 ${
                    activeCurrency === curr.code
                      ? "bg-brand-purple text-white border-brand-purple"
                      : "bg-white/5 text-slate-400 border-white/5"
                  }`}
                >
                  {curr.symbol} {curr.code}
                </button>
              ))}
            </div>
          </div>

          {/* Save & Success notifications */}
          <div className="pt-2">
            <AnimatePresence>
              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xs text-green-400 font-semibold flex items-center gap-1.5 mb-3"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Profile updated successfully!</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-4.5 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-2xl glow-purple hover:brightness-110 active:brightness-95 transition-all text-xs"
              disabled={isLoading}
            >
              {isLoading ? "Saving changes..." : "Save Configuration"}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Logout Card */}
      <div className="glass-card rounded-3xl p-5 border border-red-500/10 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-300 block">Close Session</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Log out of this device securely</span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/15 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
