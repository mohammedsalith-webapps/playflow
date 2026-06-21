import React, { createContext, useContext, useState, useEffect } from "react";
import { dbAuth, dbVendor } from "../services/db";

interface AuthUser {
  role: "admin" | "vendor";
  id: string;
  data?: any;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const session = dbAuth.getCurrentUser();
    if (session) {
      setCurrentUser(session);
    }
    setIsLoading(false);
  }, []);

  const login = async (userId: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await dbAuth.login(userId, password);
      setCurrentUser(user);
    } catch (error) {
      setCurrentUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await dbAuth.logout();
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (currentUser && currentUser.role === "vendor") {
      try {
        const freshProfile = await dbVendor.getProfile(currentUser.id);
        const updatedUser = { ...currentUser, data: freshProfile };
        setCurrentUser(updatedUser);
        
        // Sync to localStorage session
        localStorage.setItem("payflow_session", JSON.stringify(updatedUser));
      } catch (err) {
        console.error("Failed to refresh vendor profile:", err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
