import React, { useState } from "react";
import { dbVendor } from "../../services/db";
import { Store, CreditCard, Phone, Upload, LogOut, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface VendorSetupProps {
  vendorId: string;
  onSetupComplete: () => void;
  onLogout: () => void;
}

export const VendorSetup: React.FC<VendorSetupProps> = ({ vendorId, onSetupComplete, onLogout }) => {
  const [businessName, setBusinessName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim() || !upiId.trim() || !whatsAppNumber.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    // Format whatsapp number: ensure it has country code if not present (assuming Indian code 91 if length is 10)
    let formattedPhone = whatsAppNumber.replace(/\D/g, "");
    if (formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    } else if (formattedPhone.length < 10) {
      setError("Please enter a valid WhatsApp number.");
      return;
    }

    setIsLoading(true);
    try {
      await dbVendor.updateSetup(vendorId, {
        businessName: businessName.trim(),
        upiId: upiId.trim(),
        whatsAppNumber: formattedPhone,
        logoUrl: logoUrl.trim()
      });
      onSetupComplete();
    } catch (err: any) {
      setError(err.message || "Failed to update business profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-tr from-[#0F0C20] via-[#15102A] to-[#0A0518] animate-mesh relative">
      {/* Background glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-purple/20 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card rounded-3xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-brand-purple to-brand-pink" />
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-100">Setup Business</h2>
            <p className="text-xs text-slate-400 mt-1">Vendor account: {vendorId}</p>
          </div>
          <button 
            onClick={onLogout} 
            className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-red-400 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-xs p-3 bg-red-950/40 border border-red-500/20 text-red-200 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-brand-purple-light" />
              <span>Business Name *</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Starbucks Cafe"
              required
              className="w-full px-4 py-3 rounded-2xl glass-input placeholder-slate-600 text-sm font-semibold"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-brand-cyan-light" />
              <span>Merchant UPI ID *</span>
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. merchant@okaxis"
              required
              className="w-full px-4 py-3 rounded-2xl glass-input placeholder-slate-600 text-sm font-semibold"
              disabled={isLoading}
            />
            <p className="text-[9px] text-slate-500 font-semibold px-1">Payments will be routed directly to this UPI address.</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-brand-pink-light" />
              <span>WhatsApp Number *</span>
            </label>
            <input
              type="tel"
              value={whatsAppNumber}
              onChange={(e) => setWhatsAppNumber(e.target.value)}
              placeholder="e.g. 9876543210"
              required
              className="w-full px-4 py-3 rounded-2xl glass-input placeholder-slate-600 text-sm font-semibold"
              disabled={isLoading}
            />
            <p className="text-[9px] text-slate-500 font-semibold px-1">Include country code if outside India.</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Business Logo URL (optional)</span>
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="e.g. https://domain.com/logo.png"
              className="w-full px-4 py-3 rounded-2xl glass-input placeholder-slate-600 text-sm"
              disabled={isLoading}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-2xl glow-purple hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center gap-2 mt-6 text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Save Business Config</span>
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
