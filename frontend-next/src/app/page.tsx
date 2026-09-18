"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Building2,
  Stethoscope,
  HeartHandshake,
  GraduationCap,
  ArrowUpRight,
  Sparkles,
  Shield,
  KeyRound,
} from "lucide-react";

interface WorkspaceOption {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  tag: string;
  href: string;
  icon: any;
  accentColor: string;
  keyNumber: string;
}

const workspaces: WorkspaceOption[] = [
  {
    id: "campus",
    num: "01",
    title: "Campus",
    subtitle: "School Leadership & Faculty",
    tag: "Institutional",
    href: "/school",
    icon: Building2,
    accentColor: "#42B677",
    keyNumber: "1",
  },
  {
    id: "counselor",
    num: "02",
    title: "Counselor",
    subtitle: "Clinical Care Desk & Dossiers",
    tag: "Clinical",
    href: "/counselor",
    icon: Stethoscope,
    accentColor: "#005456",
    keyNumber: "2",
  },
  {
    id: "family",
    num: "03",
    title: "Family",
    subtitle: "Parents & Growth Radar",
    tag: "Home Care",
    href: "/parent",
    icon: HeartHandshake,
    accentColor: "#42B677",
    keyNumber: "3",
  },
  {
    id: "student",
    num: "04",
    title: "Student",
    subtitle: "Access ID Check-in & Journey",
    tag: "Learner",
    href: "/student/login",
    icon: GraduationCap,
    accentColor: "#91D17C",
    keyNumber: "4",
  },
];

export default function Home() {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Keyboard shortcut listener: Press 1, 2, 3, or 4 to instantly jump
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const target = workspaces.find((w) => w.keyNumber === e.key);
      if (target) {
        router.push(target.href);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#FFF8F0] dark:bg-[#121212] text-[#222222] dark:text-[#FFF8F0] flex flex-col justify-between p-6 sm:p-10 md:p-12 transition-colors duration-300 relative select-none">
      
      {/* ── Background Subtle Aesthetics ─────────────────────────────── */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#42B677]/6 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[450px] h-[450px] bg-[#005456]/8 rounded-full blur-[140px] pointer-events-none" />

      {/* ── Top Bar: Minimal Brand Mark & Direct Access ──────────────── */}
      <header className="flex items-center justify-between relative z-10 w-full shrink-0">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <img
            src="/DarkColorLogo.svg"
            alt="JaagrMind"
            className="h-8 w-auto dark:hidden object-contain"
          />
          <img
            src="/LightColorLogo.svg"
            alt="JaagrMind"
            className="h-8 w-auto hidden dark:block object-contain"
          />
          <span className="hidden md:inline-block text-[11px] font-mono tracking-widest uppercase text-[#222222]/40 dark:text-white/40 border-l border-[#222222]/15 dark:border-white/15 pl-3">
            Gateway
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[#222222]/15 dark:border-white/15 hover:border-[#222222]/40 dark:hover:border-white/40 text-[#222222] dark:text-[#FFF8F0] transition-colors"
          >
            Universal Sign In
          </Link>
        </div>
      </header>

      {/* ── Center Stage: Minimal, Tactile Workspace Selector ────────── */}
      <main className="flex-1 flex flex-col justify-center items-center max-w-6xl w-full mx-auto relative z-10 py-4">
        
        {/* Crisp, Bold Heading */}
        <div className="text-center space-y-2 mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#222222] dark:text-[#FFF8F0]">
            Where would you like to begin?
          </h1>
          <p className="text-xs sm:text-sm text-[#222222]/60 dark:text-[#FFF8F0]/60 flex items-center justify-center gap-2">
            <span>Select a workspace or press</span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#222222]/10 dark:bg-white/10 text-[#222222] dark:text-white">
              1 – 4
            </span>
            <span>on your keyboard</span>
          </p>
        </div>

        {/* ── The 4 Architectural Monolith Tiles ───────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {workspaces.map((item) => {
            const Icon = item.icon;
            const isHovered = hoveredId === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`group relative rounded-2xl border transition-all duration-300 p-6 flex flex-col justify-between h-[240px] sm:h-[280px] cursor-pointer overflow-hidden ${
                  isHovered
                    ? "border-[#222222] dark:border-[#42B677] bg-white dark:bg-[#1a1a1a] shadow-xl -translate-y-1"
                    : "border-[#222222]/15 dark:border-white/10 bg-white/60 dark:bg-[#181818]/60 backdrop-blur-sm hover:border-[#222222]/40"
                }`}
              >
                {/* Top Tile Row: Number, Key badge & Arrow */}
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#222222]/40 dark:text-white/40 group-hover:text-[#42B677] transition-colors">
                      {item.num}
                    </span>
                    <span className="hidden sm:inline-block font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#222222]/5 dark:bg-white/5 text-[#222222]/50 dark:text-white/50 group-hover:bg-[#42B677]/10 group-hover:text-[#42B677] transition-colors">
                      [{item.keyNumber}]
                    </span>
                  </div>

                  <div className="h-8 w-8 rounded-full border border-[#222222]/15 dark:border-white/15 flex items-center justify-center text-[#222222]/60 dark:text-white/60 group-hover:border-[#222222] dark:group-hover:border-[#42B677] group-hover:text-[#222222] dark:group-hover:text-[#42B677] group-hover:bg-[#42B677]/10 transition-all">
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>

                {/* Center Icon Watermark */}
                <div className="absolute right-4 bottom-16 opacity-5 dark:opacity-10 group-hover:opacity-15 dark:group-hover:opacity-20 transition-opacity pointer-events-none">
                  <Icon className="h-28 w-28 text-[#222222] dark:text-white" />
                </div>

                {/* Bottom Title & Details */}
                <div className="space-y-1.5 relative z-10">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#42B677]">
                    {item.tag}
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-[#222222] dark:text-[#FFF8F0] group-hover:text-[#005456] dark:group-hover:text-[#91D17C] transition-colors">
                    {item.title}
                  </h2>
                  <p className="text-xs text-[#222222]/70 dark:text-[#FFF8F0]/70 line-clamp-2 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                {/* Hover Accent Line */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 transition-all duration-300 ${
                    isHovered ? "bg-[#42B677] opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </main>

      {/* ── Bottom Bar: Clean Direct Links (No Fluff) ────────────────── */}
      <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#222222]/60 dark:text-[#FFF8F0]/60 relative z-10 shrink-0 border-t border-[#222222]/10 dark:border-white/10 pt-4">
        
        <div className="flex items-center gap-2">
          <span>New school partnership?</span>
          <Link
            href="/signup?tab=institute"
            className="font-semibold text-[#222222] dark:text-[#FFF8F0] hover:text-[#42B677] dark:hover:text-[#42B677] underline underline-offset-4 transition-colors"
          >
            Apply for Campus Onboarding →
          </Link>
        </div>

        <div className="flex items-center gap-5 text-[11px]">
          <Link href="/internal-ops/signin" className="hover:text-[#42B677] transition-colors">
            Internal Operations
          </Link>
          <span>•</span>
          <span>JaagrMind © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
