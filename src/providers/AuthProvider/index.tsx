import { ReactNode, createContext, useContext, useEffect, useState } from "react";

const API = "http://localhost:4000/api";

export interface SignupInput {
  email: string;
  password: string;
  name: string;
  isAdmin: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

interface AuthContextType {
  user: any;
  isLoading: boolean;
  error: Error | null;
  isLoggedIn: boolean;
  signup: (input: SignupInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // On mount, check if we're already logged in via the cookie
  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const signup = async (input: SignupInput) => {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Signup failed");
    }
    const data = await res.json();
    setUser(data);
  };

  const login = async (input: LoginInput) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
    const data = await res.json();
    setUser(data);
  };

  const logout = async () => {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, isLoggedIn: !!user, signup, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
