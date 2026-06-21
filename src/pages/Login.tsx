import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { dbAnnouncements } from "../services/db";
import type { Announcement } from "../types";
import { LogIn, AlertCircle, Volume2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    // Fetch announcements for public display on login
    const loadAnnouncements = async () => {
      try {
        const data = await dbAnnouncements.getAll();
        setAnnouncements(data);
      } catch (err) {
        console.error("Failed to load announcements:", err);
      }
    };
    loadAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      await login(userId, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
      setIsLoading(false);
    }
  };

  const isSystemAdmin = userId.trim().toLowerCase() === "admin";

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-4 py-8 bg-gradient-to-br from-[#0B0F19] via-[#111827] to-[#1E1B4B] animate-mesh relative overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-purple/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-pink/20 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="w-full max-w-md text-center mt-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-brand-purple-light via-brand-pink-light to-brand-cyan-light bg-clip-text text-transparent filter drop-shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
            PayFlow
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-2 uppercase tracking-widest">
            SaaS UPI Payments PWA
          </p>
        </motion.div>
      </div>

      {/* Login Form Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-md glass-card rounded-3xl p-8 z-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-purple via-brand-pink to-brand-cyan" />
        
        <h2 className="text-2xl font-bold text-slate-100 text-center mb-6">
          {isSystemAdmin ? "Super Admin Portal" : "Vendor Login"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-3 bg-red-950/40 border border-red-500/30 text-red-200 rounded-xl text-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              User ID / Vendor ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. VEND101 or admin"
              className="w-full px-4 py-3.5 rounded-2xl glass-input placeholder-slate-500 font-medium"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 rounded-2xl glass-input placeholder-slate-500"
              disabled={isLoading}
            />
          </div>

          {isSystemAdmin && (
            <div className="flex items-center gap-2 text-xs font-medium text-amber-400/90 py-1">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Logging in as Platform Administrator</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold rounded-2xl glow-purple hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center gap-2 mt-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Login Securely</span>
              </>
            )}
          </motion.button>
        </form>
      </motion.div>

      {/* Announcements Section */}
      <div className="w-full max-w-md mt-8 z-10">
        {announcements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-card rounded-2xl p-4 border border-brand-purple/10"
          >
            <div className="flex items-center gap-2 text-brand-purple-light font-bold text-xs uppercase tracking-wider mb-2.5">
              <Volume2 className="w-4 h-4" />
              <span>Platform Announcements</span>
            </div>
            
            <div className="space-y-3 max-h-[120px] overflow-y-auto pr-1">
              {announcements.map((ann) => (
                <div key={ann.id} className="text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <div className="font-semibold text-slate-200">{ann.title}</div>
                  <div className="text-slate-400 mt-0.5 line-clamp-2">{ann.content}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Footer notes */}
        <p className="text-center text-[10px] text-slate-500 mt-6 font-medium">
          PayFlow SaaS PWA • Protected by End-to-End Encryption
        </p>
      </div>
    </div>
  );
};
