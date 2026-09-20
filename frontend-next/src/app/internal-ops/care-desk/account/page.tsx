"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  User,
  Mail,
  ShieldCheck,
  LogOut,
  KeyRound,
  Lock,
  AlertCircle,
  CheckCircle2,
  Building2,
  Calendar,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function CareDeskAccountPage() {
  const { user, logout } = useAuth();

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (passwordData.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      await api.post("/api/auth/change-password", {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setPasswordSuccess("Password updated successfully! Keep your credentials secure.");
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to change password. Please verify your current password.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-primary" />
          <span>Care Desk Practitioner Profile</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Credentials, authentication security, and platform identity for central care operations.
        </p>
      </div>

      {/* Practitioner Identity Card */}
      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span>Care Desk Practitioner Profile</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Assigned practitioner account managed under JaagrMind Central Operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="p-4 bg-muted/40 border border-border/70 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono">Full Name:</span>
              <span className="font-semibold text-foreground text-sm">{user?.name || "Care Practitioner"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono">Work Email:</span>
              <span className="font-mono text-foreground font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono">Platform Role:</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 flex items-center gap-1">
                  <HeartHandshake className="h-3 w-3" />
                  Central Care Specialist
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono">Assigned Operations:</span>
              <span className="text-muted-foreground">JaagrMind Headquarters Desk • Independent Inquiries</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono">Portal Access Gateway:</span>
              <span className="font-mono text-[11px] text-muted-foreground">/internal-ops/signin</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              To update your legal name or contact phone, contact central platform administration.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>Update Account Password</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Ensure your care desk staff account uses a strong, unique password. Minimum 6 characters required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Current Password</label>
              <Input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
                placeholder="••••••••"
                className="text-xs max-w-md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">New Password</label>
              <Input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
                placeholder="••••••••"
                className="text-xs max-w-md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Confirm New Password</label>
              <Input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                required
                placeholder="••••••••"
                className="text-xs max-w-md"
              />
            </div>

            <Button type="submit" size="sm" disabled={changingPassword} className="text-xs">
              {changingPassword ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
