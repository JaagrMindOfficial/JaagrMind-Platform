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

export interface StudentLoginCredentials {
  accessId?: string;
  schoolId: string;
  mobileNumber?: string;
  email?: string;
  class?: string;
  section?: string;
  rollNumber?: string;
  stream?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  internalLogin: (email: string, password: string, redirectTo?: string) => Promise<void>;
  enableParentRole: () => Promise<void>;
  studentLogin: (
    credentialsOrAccessId: StudentLoginCredentials | string,
    schoolId?: string,
    mobileNumber?: string,
    email?: string
  ) => Promise<void>;
  setAuthSession: (token: string, user: User) => void;
  logout: (redirectTo?: unknown) => void;
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

import {
  setAuthCookie,
  setUserSessionCookies,
  clearAllAuthCookies,
  clearAllAuthSession,
  getValidStoredToken,
  isTokenExpired,
} from "@/lib/auth-storage";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getValidStoredToken();
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;

    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setUserSessionCookies(token, parsed);

        // Background session verification with /api/auth/me:
        // Ensures if the token is revoked, user is removed, or expired on the server,
        // client-side session is gracefully invalidated without waiting for a user action.
        api.get("/api/auth/me", { skipAuth: false })
          .then((freshUser) => {
            if (freshUser && freshUser.id) {
              setUser(freshUser);
              localStorage.setItem("user", JSON.stringify(freshUser));
              setUserSessionCookies(token, freshUser);
            }
          })
          .catch((err: any) => {
            const msg = String(err?.message || "");
            if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("not found")) {
              clearAllAuthSession();
              setUser(null);
            }
          });
      } catch {
        clearAllAuthSession();
        setUser(null);
      }
    } else {
      clearAllAuthSession();
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, redirectTo?: string) => {
    localStorage.removeItem("superadmin_impersonating");
    const data = await api.post("/api/auth/login", { email, password }, { skipAuth: true });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUserSessionCookies(data.token, data.user);
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
    setUserSessionCookies(data.token, data.user);
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
      setUserSessionCookies(data.token, data.user);
      setUser(data.user);
    }
  };

  const studentLogin = async (
    credentialsOrAccessId: StudentLoginCredentials | string,
    schoolId?: string,
    mobileNumber?: string,
    email?: string
  ) => {
    let payload: any = {};
    if (typeof credentialsOrAccessId === "string") {
      payload = { accessId: credentialsOrAccessId, schoolId, mobileNumber, email };
    } else {
      payload = { ...credentialsOrAccessId };
    }

    const data = await api.post("/api/auth/student/login", payload, { skipAuth: true });
    
    // Construct a user object that fits our AuthContext model
    const studentUser: User = {
      id: data._id,
      email: payload.email || "",
      name: data.name,
      role: "student",
      roles: [{ user_id: data._id, role: "student", entity_id: payload.schoolId }]
    };
    
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(studentUser));
    setUserSessionCookies(data.token, studentUser);
    setUser(studentUser);
    
    router.push("/student");
  };

  const setAuthSession = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUserSessionCookies(token, userData);
    setUser(userData);
  };

  const logout = (redirectTo?: unknown) => {
    clearAllAuthSession();
    setUser(null);
    if (typeof redirectTo === "string") {
      router.push(redirectTo);
      return;
    }
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
