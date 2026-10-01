"use client";

import { useSyncExternalStore } from "react";
import { notFound } from "next/navigation";

export type AssessmentThemeId = "jm-signature" | "jm-serene" | "jm-crayon";

export const VALID_THEME_IDS: readonly AssessmentThemeId[] = [
  "jm-signature",
  "jm-serene",
  "jm-crayon",
] as const;

export function isValidThemeId(theme: string | null | undefined): theme is AssessmentThemeId {
  return Boolean(theme && (theme === "jm-signature" || theme === "jm-serene" || theme === "jm-crayon"));
}

/**
 * Validates the `?theme=` query parameter.
 * If present and NOT one of the 3 allowed themes (jm-signature, jm-serene, jm-crayon),
 * triggers a Next.js 404 Not Found error immediately.
 */
export function validateThemeParam(searchParams: { get: (key: string) => string | null } | URLSearchParams): void {
  const themeParam = searchParams.get("theme");
  if (themeParam && !isValidThemeId(themeParam)) {
    notFound();
  }
}

export interface AssessmentThemeConfig {
  id: AssessmentThemeId;
  name: string;
  subtitle: string;
  iconName: string;
  primary: string; // Deep forest teal or green for buttons & radio accent
  primaryDark: string; // Hover state
  primaryWash: string; // Soft lavender or sage tint for selected option
  primaryWashBorder: string; // Soft border for selected option
  progressBarColor: string;
  progressBarTrack: string;
  bgPage: string; // Page background
  ringColor: string;
  pillBg: string;
  badgeBorder: string;
  gradientBar: string;
  buttonClass: string;
  activeRadioClass: string;
  progressStyle?: "continuous" | "segmented";
}

export const ASSESSMENT_THEMES: Record<AssessmentThemeId, AssessmentThemeConfig> = {
  "jm-signature": {
    id: "jm-signature",
    name: "JM Signature",
    subtitle: "JaagrMind Signature purple & mindful teal reflection",
    iconName: "✨",
    primary: "#0B4F48",
    primaryDark: "#083E38",
    primaryWash: "#EEF1FE",
    primaryWashBorder: "#D6DAFC",
    progressBarColor: "#8161A3",
    progressBarTrack: "#EDE8F5",
    bgPage: "#FAF8F5",
    ringColor: "ring-[#0B4F48]/20",
    pillBg: "bg-[#0B4F48]/10 text-[#0B4F48] dark:text-[#34d399] border-[#0B4F48]/20",
    badgeBorder: "border-[#0B4F48]",
    gradientBar: "from-[#8161A3] to-[#977AB8]",
    buttonClass: "bg-[#0B4F48] hover:bg-[#083E38] text-white shadow-xs transition-colors",
    activeRadioClass: "bg-[#EEF1FE] dark:bg-indigo-950/40 border-[#D6DAFC] dark:border-indigo-800/60",
    progressStyle: "continuous",
  },
  "jm-serene": {
    id: "jm-serene",
    name: "JM Serene",
    subtitle: "Natural calm with sage green accents & organic earth palette",
    iconName: "🌿",
    primary: "#205A44",
    primaryDark: "#174332",
    primaryWash: "#EDF3EE",
    primaryWashBorder: "#D1DCD3",
    progressBarColor: "#205A44",
    progressBarTrack: "#E6E9E1",
    bgPage: "#FBF9F2",
    ringColor: "ring-[#205A44]/20",
    pillBg: "bg-[#205A44]/10 text-[#205A44] dark:text-[#4ade80] border-[#205A44]/20",
    badgeBorder: "border-[#205A44]",
    gradientBar: "from-[#205A44] to-[#367B60]",
    buttonClass: "bg-[#205A44] hover:bg-[#174332] text-white shadow-xs transition-colors",
    activeRadioClass: "bg-[#EDF3EE] dark:bg-emerald-950/40 border-[#D1DCD3] dark:border-emerald-800/60",
    progressStyle: "segmented",
  },
  "jm-crayon": {
    id: "jm-crayon",
    name: "JM Crayon",
    subtitle: "Playful hand-drawn storybook with smiling sun, rolling hills & crayon art",
    iconName: "🖍️",
    primary: "#1A5D3F",
    primaryDark: "#144931",
    primaryWash: "#F2F7F4",
    primaryWashBorder: "#1A5D3F",
    progressBarColor: "#1A5D3F",
    progressBarTrack: "#E8E2D7",
    bgPage: "#FAF7F0",
    ringColor: "ring-[#1A5D3F]/20",
    pillBg: "bg-[#1A5D3F]/10 text-[#1A5D3F] dark:text-[#4ade80] border-[#1A5D3F]/20",
    badgeBorder: "border-[#1A5D3F]",
    gradientBar: "from-[#1A5D3F] to-[#2E8B57]",
    buttonClass: "bg-[#1A5D3F] hover:bg-[#144931] text-white shadow-xs transition-colors rounded-xl",
    activeRadioClass: "bg-[#F2F7F4] dark:bg-emerald-950/40 border-2 border-[#1A5D3F] dark:border-emerald-600 shadow-xs",
    progressStyle: "segmented",
  },
};

export const ADMIN_AVAILABLE_THEMES: AssessmentThemeConfig[] = [
  ASSESSMENT_THEMES["jm-signature"],
  ASSESSMENT_THEMES["jm-serene"],
  ASSESSMENT_THEMES["jm-crayon"],
];

const ADMIN_DEFAULT_THEME_KEY = "jaagr_admin_checkin_theme";
let currentTheme: AssessmentThemeId = "jm-signature";
const listeners = new Set<() => void>();

function getSnapshot(): AssessmentThemeId {
  if (typeof window !== "undefined") {
    try {
      // Check URL param first if present on the page
      const searchParams = new URLSearchParams(window.location.search);
      const urlTheme = searchParams.get("theme");
      if (urlTheme) {
        if (isValidThemeId(urlTheme)) {
          currentTheme = urlTheme;
          return currentTheme;
        }
      }

      // Check admin configured default
      const stored = localStorage.getItem(ADMIN_DEFAULT_THEME_KEY);
      if (isValidThemeId(stored)) {
        currentTheme = stored;
      } else {
        currentTheme = "jm-signature";
      }
    } catch {
      // fallback
    }
  }
  return currentTheme;
}

function getServerSnapshot(): AssessmentThemeId {
  return "jm-signature";
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setAssessmentTheme(id: AssessmentThemeId) {
  if (isValidThemeId(id)) {
    currentTheme = id;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ADMIN_DEFAULT_THEME_KEY, id);
      } catch {
        // ignore
      }
    }
    listeners.forEach((listener) => listener());
  }
}

export function useAssessmentTheme(overrideThemeId?: string) {
  const storeThemeId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const activeId: AssessmentThemeId =
    overrideThemeId && isValidThemeId(overrideThemeId) ? overrideThemeId : storeThemeId;

  return {
    currentThemeId: activeId,
    theme: ASSESSMENT_THEMES[activeId] || ASSESSMENT_THEMES["jm-signature"],
    setThemeId: setAssessmentTheme,
  };
}
