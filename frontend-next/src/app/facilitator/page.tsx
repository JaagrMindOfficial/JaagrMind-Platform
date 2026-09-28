"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  QrCode,
  Users,
  Copy,
  Check,
  Maximize2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  HeartHandshake,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Clock,
  Compass,
  CheckCircle2,
  Layers,
  Presentation,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface WorkshopDomainStats {
  domain: string;
  name: string;
  consistentPct: number;
  developingPct: number;
  difficultPct: number;
  insight: string;
  prompt: string;
}

export default function FacilitatorWorkspacePage() {
  const router = useRouter();

  // Session state
  const [sessionName, setSessionName] = useState("Grade 10 Reflection & Study Rhythm Workshop");
  const [sessionCode, setSessionCode] = useState("chk_wkshop_focus");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "prepost" | "prompts">("live");

  // Participant counter & simulated live reflection state
  const [participantCount, setParticipantCount] = useState(38);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/checkin/${sessionCode}`
    : `http://localhost:3000/checkin/${sessionCode}`;

  useEffect(() => {
    QRCode.toDataURL(checkinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).then(setQrDataUrl).catch(console.error);
  }, [checkinUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateRandomSessionCode = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "chk_";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSessionCode(code);
  };

  const domainStats: WorkshopDomainStats[] = [
    {
      domain: "A",
      name: "Focus & Attention",
      consistentPct: 42,
      developingPct: 37,
      difficultPct: 21,
      insight: "Many students report initiation friction during high-volume study chunks and phone message interruptions.",
      prompt: "When you notice your attention drifting during independent study, what is one strategy that brings you back?",
    },
    {
      domain: "B",
      name: "Inner Confidence",
      consistentPct: 48,
      developingPct: 34,
      difficultPct: 18,
      insight: "Comfort with mistakes is variable; students report hesitation asking questions in large group settings.",
      prompt: "What helps you feel safe enough to raise your hand or ask when an explanation is not clicking?",
    },
    {
      domain: "C",
      name: "Social Interaction",
      consistentPct: 55,
      developingPct: 32,
      difficultPct: 13,
      insight: "Strong overall peer connectivity with occasional friction from absorbing peer conflict.",
      prompt: "How do you recharge when peer conversations or group dynamics start to feel emotionally draining?",
    },
    {
      domain: "D",
      name: "Healthy Digital Habits",
      consistentPct: 34,
      developingPct: 43,
      difficultPct: 23,
      insight: "Late evening device usage is the most widespread challenge affecting morning alertness.",
      prompt: "What is one small boundary (like charging outside the bedroom) that might help protect your sleep rhythm?",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Facilitator Mode Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 bg-primary/10 text-primary border-primary/30 flex items-center gap-1.5">
              <Presentation className="h-3.5 w-3.5" />
              <span>Workshop Facilitator Mode</span>
            </Badge>
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
              Live Session
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-2">
            Student Reflection & Workshop Lab
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time cohort reflection telemetry, smartboard projection, and guided discussion prompts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => setProjectorOpen(true)}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Launch Smartboard Projector</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={generateRandomSessionCode}
            className="text-xs h-9 gap-1.5 cursor-pointer font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>New Random Session</span>
          </Button>
          <Link href="/school/tests">
            <Button size="sm" variant="ghost" className="text-xs h-9 gap-1 cursor-pointer">
              <span>Back to School Portal</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Non-Clinical Aggregate Disclaimer (Doc 1, Section 8 & 15) */}
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 flex items-start gap-3.5 text-sky-950 dark:text-sky-200 shadow-2xs">
        <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground">
            Facilitator Boundary & Non-Clinical Snapshot
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This module presents aggregate room patterns from self-reported student check-ins. It is designed to spark healthy, non-evaluative peer discussion. Facilitators guide reflection and normalize adolescent experiences — they do not diagnose individuals.
          </p>
        </div>
      </div>

      {/* Live Room Session Quick Launcher & QR Display Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Link & Smartboard Display (5 cols) */}
        <Card className="lg:col-span-5 border-border shadow-none flex flex-col justify-between">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Classroom Access & QR Code
                </CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Code: {sessionCode}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Project this QR code on the room display for instant student check-in on phones or tablets.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 dark:border-slate-800 shadow-inner w-full max-w-[280px] mx-auto">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Session QR Code"
                  className="w-48 h-48 object-contain rounded-md"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}
              <span className="text-[11px] font-mono text-slate-600 font-bold mt-2">
                Scan to join reflection
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={checkinUrl}
                  className="font-mono text-xs h-9 bg-muted/40"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="h-9 px-3 shrink-0 cursor-pointer font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Joined: <strong className="text-foreground">{participantCount} Students</strong>
                </span>
                <button
                  onClick={() => {
                    setIsRefreshing(true);
                    setTimeout(() => setIsRefreshing(false), 600);
                  }}
                  className="text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh Telemetry
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Room Reflection Telemetry & Tabs (7 cols) */}
        <Card className="lg:col-span-7 border-border shadow-none flex flex-col justify-between">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Room Pattern Distribution (32-Item v4.0 Module)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Aggregate distribution across the three qualitative reflection patterns.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab("live")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    activeTab === "live"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Live Breakdown
                </button>
                <button
                  onClick={() => setActiveTab("prepost")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    activeTab === "prepost"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pre / Post Shift
                </button>
                <button
                  onClick={() => setActiveTab("prompts")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    activeTab === "prompts"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Discussion Prompts
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {activeTab === "live" && (
              <div className="space-y-4">
                {domainStats.map((item) => (
                  <div key={item.domain} className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center">
                          {item.domain}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {item.consistentPct}% Consistent
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                          {item.developingPct}% Variable
                        </span>
                        <span className="text-sky-600 dark:text-sky-400">
                          {item.difficultPct}% High Effort
                        </span>
                      </div>
                    </div>

                    {/* Tri-color Stacked Bar */}
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${item.consistentPct}%` }}
                        title={`${item.consistentPct}% More Consistent`}
                      />
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${item.developingPct}%` }}
                        title={`${item.developingPct}% Developing / Variable`}
                      />
                      <div
                        className="h-full bg-sky-500"
                        style={{ width: `${item.difficultPct}%` }}
                        title={`${item.difficultPct}% More Difficult Right Now`}
                      />
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.insight}
                    </p>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      More Consistent (24-32)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Developing / Variable (16-23)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                      More Difficult Right Now (8-15)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "prepost" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Pre-Workshop vs Post-Workshop Reflection Comparison
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                      Cohort Awareness Shift
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Compare self-discovery awareness before the interactive session versus post-session reflection. Non-judgmental shifts demonstrate increased vocabulary for self-regulation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                    <span className="font-bold text-foreground">Task Initiation Awareness</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Pre-session: 61% felt stuck without knowing why. Post-session: 84% recognized sensory micro-steps and activation friction as normal.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                    <span className="font-bold text-foreground">Classroom Voice & Asking</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Pre-session: 52% reported evaluative silence. Post-session: 78% identified peer-asking or digital question boxes as safe stepping stones.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                    <span className="font-bold text-foreground">Digital Sunset Intent</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Pre-session: 22% maintained device-free sleep. Post-session: 68% committed to testing a 10 PM charging boundary for one week.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                    <span className="font-bold text-foreground">Normalizing Peer Stress</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Pre-session: 58% believed &ldquo;everyone else has it figured out&rdquo;. Post-session: 92% felt relief seeing collective room patterns.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "prompts" && (
              <div className="space-y-3.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Recommended non-evaluative prompts for facilitating student self-discovery (Document 1, Section 8):
                </p>

                {domainStats.map((item, idx) => (
                  <div key={item.domain} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        Prompt {idx + 1}: {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">Domain {item.domain}</span>
                    </div>
                    <blockquote className="text-xs text-foreground italic border-l-2 border-primary/50 pl-2.5 py-0.5 leading-relaxed">
                      &ldquo;{item.prompt}&rdquo;
                    </blockquote>
                  </div>
                ))}

                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Facilitator Tip: The &quot;One Small Tweak&quot; Anchor
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Close the session by asking each student to choose just ONE micro-practice for the week (e.g. 5-minute study timer or placing phone across the room at bedtime) rather than attempting a total overhaul.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Facilitator Boundary & Safety Protocol (Document 1, Section 8 & 15) */}
      <Card className="border-border shadow-none border-l-4 border-l-amber-500 bg-amber-500/5">
        <CardContent className="p-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h4 className="text-xs font-bold text-foreground">
              Facilitator Role & Safety Referral Protocol
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Facilitator Boundaries:</strong> Facilitators guide collective reflection and normalize common adolescent challenges. Do not evaluate individual students, offer psychological diagnoses, or pressure students to share private personal details in group settings. If a student expresses significant emotional distress or asks for personal help, privately connect them to the campus assigned counselor.
          </p>
        </CardContent>
      </Card>

      {/* Full-Screen Smartboard Projector Modal */}
      <Dialog open={projectorOpen} onOpenChange={setProjectorOpen}>
        <DialogContent className="max-w-2xl text-center p-8 bg-card border-border space-y-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-foreground">
              Student Reflection Check-in
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Point your phone or tablet camera at the QR code below to launch the 32-item reflection module.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white border border-slate-200 shadow-md max-w-sm mx-auto">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Large Session QR Code"
                className="w-64 h-64 object-contain rounded-lg"
              />
            )}
            <div className="mt-3 text-center">
              <span className="text-xs font-mono font-bold text-slate-800">
                Session Code: {sessionCode}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 max-w-md mx-auto">
            <p className="text-xs text-muted-foreground font-mono">
              Direct Link: <strong className="text-foreground">{checkinUrl}</strong>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Anonymous &amp; Non-evaluative • Designed for Student Self-Discovery</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
