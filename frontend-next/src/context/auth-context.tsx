"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

export interface UserRole {
  user_id: string;
  role: string;
  entity_id?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  roles: UserRole[];
  is_internal?: boolean;
  phone?: string;
  metadata?: Record<string, any>;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  internalLogin: (email: string, password: string, redirectTo?: string) => Promise<void>;
  enableParentRole: () => Promise<void>;
  studentLogin: (accessId: string, schoolId: string, mobileNumber?: string, email?: string) => Promise<void>;
  setAuthSession: (token: string, user: User) => void;
  logout: () => void;
  isSuperAdmin: boolean;
  isSchoolAdmin: boolean;
  isCounselor: boolean;
  isCentralCounselor: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  hasRole: (role: string) => boolean;
  schoolId: string | null; // entity_id for school_admin, counselor, or teacher
}

const AuthContext = createContext<AuthContextType | null>(null);

function setAuthCookie(token: string) {
  if (typeof document !== "undefined") {
    document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function clearAuthCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
  }
}

function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let token = localStorage.getItem("token");
    if (!token) {
      token = getAuthCookie();
      if (token) {
        localStorage.setItem("token", token);
      }
    }
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setAuthCookie(token);
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        clearAuthCookie();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, redirectTo?: string) => {
    localStorage.removeItem("superadmin_impersonating");
    const data = await api.post("/api/auth/login", { email, password }, { skipAuth: true });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setAuthCookie(data.token);
    setUser(data.user);

    const roles = data.user.roles?.map((r: UserRole) => r.role) || [];

    // Honor valid redirect URL if user role is authorized
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      if (
        (redirectTo.startsWith("/counselor") && roles.includes("counselor")) ||
        (redirectTo.startsWith("/school") && (roles.includes("school_admin") || roles.includes("teacher"))) ||
        (redirectTo.startsWith("/student") && roles.includes("student")) ||
        (redirectTo.startsWith("/parent") && (roles.includes("parent") || roles.includes("relative")))
      ) {
        router.push(redirectTo);
        return;
      }
    }

    // Dynamic routing based on role
    if (roles.includes("school_admin")) {
      router.push("/school");
    } else if (roles.includes("counselor")) {
      router.push("/counselor");
    } else if (roles.includes("teacher")) {
      router.push("/school");
    } else if (roles.includes("student")) {
      router.push("/student");
    } else if (roles.includes("parent") || roles.includes("relative")) {
      router.push("/parent");
    } else {
      router.push("/dashboard");
    }
  };

  const internalLogin = async (email: string, password: string, redirectTo?: string) => {
    const data = await api.post("/api/auth/internal/login", { email, password }, { skipAuth: true });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setAuthCookie(data.token);
    setUser(data.user);

    const roles = data.user.roles?.map((r: UserRole) => r.role) || [];

    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      if (
        (redirectTo.includes("admin") && roles.includes("superadmin")) ||
        (redirectTo.includes("care-desk") && (roles.includes("counselor") || roles.includes("superadmin")))
      ) {
        router.push(redirectTo);
        return;
      }
    }

    if (roles.includes("superadmin")) {
      router.push("/internal-ops/admin");
    } else if (roles.includes("counselor")) {
      router.push("/internal-ops/care-desk");
    } else {
      router.push("/internal-ops");
    }
  };

  const enableParentRole = async () => {
    const data = await api.post("/api/auth/enable-parent", {});
    if (data.token && data.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setAuthCookie(data.token);
      setUser(data.user);
    }
  };

  const studentLogin = async (accessId: string, schoolId: string, mobileNumber?: string, email?: string) => {
    const data = await api.post("/api/auth/student/login", { accessId, schoolId, mobileNumber, email }, { skipAuth: true });
    localStorage.setItem("token", data.token);
    setAuthCookie(data.token);
    
    // Construct a user object that fits our AuthContext model
    const studentUser: User = {
      id: data._id,
      email: email || "",
      name: data.name,
      role: "student",
      roles: [{ user_id: data._id, role: "student", entity_id: schoolId }]
    };
    
    localStorage.setItem("user", JSON.stringify(studentUser));
    setUser(studentUser);
    
    router.push("/student");
  };

  const setAuthSession = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setAuthCookie(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("superadmin_impersonating");
    clearAuthCookie();
    setUser(null);
    if (pathname.startsWith("/admin") || pathname.startsWith("/care-desk") || pathname.startsWith("/internal-ops")) {
      router.push("/internal-ops/signin");
    } else {
      router.push("/");
    }
  };

  const hasRole = (role: string) =>
    user?.role === role || (user?.roles?.some((r) => r.role === role) ?? false);

  const schoolId =
    user?.roles?.find(
      (r) => r.role === "school_admin" || r.role === "teacher" || r.role === "counselor"
    )?.entity_id ?? null;

	const value: AuthContextType = {
		user,
		loading,
		login,
		internalLogin,
		enableParentRole,
		studentLogin,
		setAuthSession,
		logout,
		isSuperAdmin: hasRole("superadmin"),
		isSchoolAdmin: hasRole("school_admin"),
		isCounselor: hasRole("counselor"),
		isCentralCounselor: hasRole("counselor") && (!schoolId || schoolId === "jaagrmind"),
		isTeacher: hasRole("teacher"),
		isStudent: hasRole("student") || (user as any)?.role === "student",
		hasRole,
		schoolId,
	};

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
