"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      router.push("/login");
      return;
    }
    
    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      const roles = parsed.roles?.map((r: any) => r.role) || [];
      if (roles.includes("parent") || roles.includes("relative")) {
        router.replace("/parent");
        return;
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  if (!user) return <div className="flex h-screen items-center justify-center bg-background text-muted-foreground text-sm">Loading...</div>;

  const isAdmin = user.roles?.some((r: any) => r.role === "superadmin");

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background text-[10px] font-bold tracking-tight">JM</span>
          </div>
          <span className="text-sm font-semibold">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {user.roles.map((r: any, idx: number) => (
            <span key={idx} className="text-xs text-muted-foreground capitalize bg-muted px-2.5 py-1 rounded-md">
              {r.role}
            </span>
          ))}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => router.push("/admin")}>
              Admin Panel
            </Button>
          )}
          <ThemeToggle />
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              router.push("/");
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Signed in as {user.email}</p>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Student Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 border border-dashed rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                Radar chart will render here
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Active Assessments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <p className="text-sm font-medium">Trust Dynamics Module</p>
                <p className="text-xs text-muted-foreground mt-0.5">24 students completed</p>
              </div>
              <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <p className="text-sm font-medium">Focus Mapping</p>
                <p className="text-xs text-muted-foreground mt-0.5">18 students completed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
