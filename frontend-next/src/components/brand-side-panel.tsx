"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface BrandSidePanelProps {
  subtitle?: string;
}

export function BrandSidePanel({ subtitle }: BrandSidePanelProps) {
  return (
    <div className="w-full md:w-5/12 lg:w-[46%] h-full flex flex-col justify-between p-8 sm:p-12 lg:p-14 border-b md:border-b-0 md:border-r border-[#222222]/10 dark:border-white/10 relative overflow-hidden bg-[#FFF5EA]/70 dark:bg-[#151515] shrink-0 select-none">

      {/* ── Floating Brand Pill Graphics (from Brand Kit, strictly no purple) ── */}
      <div className="absolute -top-16 -right-20 w-80 h-32 rounded-full bg-[#42B677]/15 -rotate-[32deg] pointer-events-none blur-xs" />
      <div className="absolute top-1/3 -left-20 w-96 h-36 rounded-full bg-[#005456]/12 -rotate-[32deg] pointer-events-none blur-xs" />
      <div className="absolute -bottom-16 right-10 w-72 h-28 rounded-full bg-[#91D17C]/15 -rotate-[32deg] pointer-events-none blur-xs" />

      {/* ── Top: Logo ───────────────────────────────────────────────────────── */}
      <div className="relative z-10">
        <Link href="/" className="inline-block transition-opacity hover:opacity-90">
          <img
            src="/DarkColorLogo.svg"
            alt="JaagrMind Logo"
            className="h-9 w-auto dark:hidden object-contain"
          />
          <img
            src="/LightColorLogo.svg"
            alt="JaagrMind Logo"
            className="h-9 w-auto hidden dark:block object-contain"
          />
        </Link>
      </div>

      {/* ── Center: Brand Philosophy Typography ─────────────────────────────── */}
      <div className="relative z-10 space-y-4 my-auto py-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-[#222222]/5 dark:bg-white/10 border border-[#222222]/10 dark:border-white/15 text-[#222222]/80 dark:text-[#FFF8F0]/90">

          <span>EMOTIONS MADE EASY</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#222222] dark:text-[#FFF8F0] leading-[1.08]">
          Making <br />
          Young Minds <br />
          <span className="font-highlight font-bold text-[#42B677] text-5xl sm:text-6xl lg:text-7xl italic inline-block underline decoration-[#91D17C]/60 decoration-wavy decoration-2 underline-offset-8">
            aware
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-[#222222]/70 dark:text-[#FFF8F0]/70 max-w-sm leading-relaxed pt-1">
          {subtitle || "Holistic support, early behavioral assessments, and guided therapy for every young mind finding its voice."}
        </p>
      </div>

    </div>
  );
}
