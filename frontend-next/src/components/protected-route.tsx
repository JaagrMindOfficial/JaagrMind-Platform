"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Unauthenticated users on internal routes go to internal-ops/signin
        if (pathname.startsWith("/admin") || pathname.startsWith("/care-desk") || pathname.startsWith("/internal-ops")) {
          router.replace(`/internal-ops/signin?redirect=${encodeURIComponent(pathname)}`);
        } else {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      // Strict enforcement for /internal-ops routes: user must be internal
      if (pathname.startsWith("/internal-ops") && !pathname.startsWith("/internal-ops/signin") && pathname !== "/internal-ops") {
        const isInternalStaff = user.is_internal || hasRole("superadmin") || (hasRole("counselor") && (!user?.roles?.find(r => r.role === "counselor")?.entity_id || user?.roles?.find(r => r.role === "counselor")?.entity_id === "jaagrmind"));
        if (!isInternalStaff) {
          router.replace(`/internal-ops/signin?error=${encodeURIComponent("Access restricted to JaagrMind internal operations personnel.")}`);
          return;
        }
      }

      if (allowedRoles && allowedRoles.length > 0) {
        // Check if user has at least one of the allowed roles
        const hasAccess = allowedRoles.some((role) => hasRole(role));
        if (!hasAccess) {
          // If no access, redirect to the most appropriate dashboard based on their role
          if (hasRole("superadmin")) {
            router.replace("/internal-ops/admin");
          } else if (hasRole("counselor")) {
            const counselorRole = user?.roles?.find((r) => r.role === "counselor");
            if (counselorRole?.entity_id && counselorRole.entity_id !== "jaagrmind") {
              router.replace("/counselor");
            } else {
              router.replace("/internal-ops/care-desk");
            }
          } else if (hasRole("school_admin") || hasRole("teacher")) {
            router.replace("/school");
          } else if (hasRole("student")) {
            router.replace("/student");
          } else if (hasRole("parent") || hasRole("relative")) {
            router.replace("/parent");
          } else {
            router.replace("/dashboard");
          }
        }
      }
    }
  }, [user, loading, allowedRoles, router, pathname, hasRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some((role) => hasRole(role));
    if (!hasAccess) {
      return null; // Will redirect in useEffect
    }
  }

  return <>{children}</>;
}
