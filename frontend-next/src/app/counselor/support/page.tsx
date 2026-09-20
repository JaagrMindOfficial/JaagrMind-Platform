"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LifeBuoy, Mail, Phone, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CounselorSupportPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <LifeBuoy className="h-6 w-6 text-primary" />
          <span>Counselor Support & Guidance Desk</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Get assistance with case intake, student psychological metric interpretations, or platform operations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-500" />
              <span>JaagrMind Care & Advisory Desk</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Direct consultation with our senior child psychology & assessment team.
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
              <LifeBuoy className="h-4 w-4 text-emerald-500" />
              <span>JaagrMind Platform Support</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Operational assistance, counselor account settings, or student roster synchronization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              For system inquiries, roster updates, or technical access issues:
            </p>
            <p className="font-mono font-medium text-foreground">support@jaagrmind.com</p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
