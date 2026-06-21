import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/AdminDashboard";
import { VendorDashboard } from "./pages/vendor/VendorDashboard";

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-400 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Syncing PayFlow Session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  if (currentUser.role === "admin") {
    return <AdminDashboard />;
  }

  return <VendorDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
