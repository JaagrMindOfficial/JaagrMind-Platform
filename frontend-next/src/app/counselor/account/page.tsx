"use client";

import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Mail, ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CounselorAccountPage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-primary" />
          <span>Counselor Account Profile</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your credentials and institutional counseling profile.
        </p>
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span>Profile Information</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Assigned school counselor credentials managed by your school administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="p-3 bg-muted/40 border border-border/70 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono">Full Name:</span>
              <span className="font-semibold text-foreground">{user?.name || "Dr. Sunita Rao"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono">Email Address:</span>
              <span className="font-mono text-foreground font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono">Portal Role:</span>
              <Badge variant="outline" className="text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                School Counselor
              </Badge>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
