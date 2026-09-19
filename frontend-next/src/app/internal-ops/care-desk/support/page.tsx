"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LifeBuoy, Mail, ShieldCheck, HeartHandshake, Headphones } from "lucide-react";

export default function CareDeskSupportPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <LifeBuoy className="h-6 w-6 text-primary" />
          <span>Care Desk Clinical Operations & Support</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Operational telemetry assistance, clinical escalation procedures, and internal platform inquiries.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-500" />
              <span>JaagrMind Clinical Advisory Board</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Direct consultation on high-priority student cases and psychological regulation protocols.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              For complex student intervention reviews or sensitive cases requiring second opinions:
            </p>
            <p className="font-mono font-medium text-foreground">clinical@jaagrmind.com</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Headphones className="h-4 w-4 text-emerald-500" />
              <span>Platform & Telemetry Support</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Platform administration, consultation queue triage, and technical assistance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              For consultation triage issues, roster synchronizations, or internal practitioner accounts:
            </p>
            <p className="font-mono font-medium text-foreground">support@jaagrmind.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
