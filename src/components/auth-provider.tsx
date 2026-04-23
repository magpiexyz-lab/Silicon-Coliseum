"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  cpBalance: number;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  cpBalance: number;
  isAdmin: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  updateCpBalance: (newBalance: number) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  cpBalance: 0,
  isAdmin: false,
  isLoggedIn: false,
  isLoading: true,
  refreshUser: async () => {},
  updateCpBalance: () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.status === 401) {
        // Not logged in — normal state
        setUser(null);
        return;
      }
      if (res.status === 404) {
        // Stale session — user record missing. Clear cookie.
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {}
        setUser(null);
        return;
      }
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const updateCpBalance = useCallback((newBalance: number) => {
    setUser((prev) => (prev ? { ...prev, cpBalance: newBalance } : null));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        cpBalance: user?.cpBalance ?? 0,
        isAdmin: user?.isAdmin ?? false,
        isLoggedIn: !!user,
        isLoading,
        refreshUser,
        updateCpBalance,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
