import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  usn: string | null;
  branch: string | null;
  year: number | null;
  course: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  usn?: string;
  branch?: string;
  year?: number;
  course?: string;
  role?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        await loadUser(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setToken(session.access_token);
        await loadUser(session.user.id);
      } else {
        setUser(null);
        setToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUser = async (id: string) => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (data) {
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        usn: data.usn,
        branch: data.branch,
        year: data.year,
        course: data.course,
        avatarUrl: data.avatar_url,
        isAdmin: data.role === "Admin",
      });
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const register = async (registerData: RegisterData) => {
    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: {
        data: { name: registerData.name }
      }
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      await supabase.from("users").upsert({
        id: data.user.id,
        email: registerData.email,
        name: registerData.name,
        usn: registerData.usn,
        branch: registerData.branch,
        year: registerData.year,
        course: registerData.course,
        role: registerData.role || "Student",
      });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
