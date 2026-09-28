"use client";

import { useSyncExternalStore } from "react";

export type AssessmentThemeId = "duo-green" | "spark-blue" | "sunny-amber";

export interface AssessmentThemeConfig {
  id: AssessmentThemeId;
  name: string;
  subtitle: string;
  iconName: string;
  primary: string; // Hex for primary fill
  primaryDark: string; // 3D bottom bevel border
  primaryWash: string; // Soft highlight
  ringColor: string;
  pillBg: string;
  badgeBorder: string;
  gradientBar: string;
  buttonClass: string;
  activeRadioClass: string;
}

export const ASSESSMENT_THEMES: Record<AssessmentThemeId, AssessmentThemeConfig> = {
  "duo-green": {
    id: "duo-green",
    name: "Nature Garden",
    subtitle: "Calming botanical greens & mindful energy",
    iconName: "🌿",
    primary: "#58cc02",
    primaryDark: "#46a302",
    primaryWash: "#e6fad7",
    ringColor: "ring-[#58cc02]/30",
    pillBg: "bg-[#58cc02]/10 text-[#46a302] dark:text-[#58cc02] border-[#58cc02]/30",
    badgeBorder: "border-[#46a302]",
    gradientBar: "from-[#58cc02] via-[#2fcb3e] to-[#7ce539]",
    buttonClass: "bg-[#58cc02] hover:bg-[#61df02] text-white border-2 border-[#46a302] border-b-4 border-b-[#3c8c01] active:border-b-2 active:translate-y-[2px]",
    activeRadioClass: "bg-[#58cc02] text-white border-2 border-[#46a302] border-b-4 border-b-[#3c8c01] shadow-md ring-4 ring-[#58cc02]/25",
  },
  "spark-blue": {
    id: "spark-blue",
    name: "Breeze Sky",
    subtitle: "Clear sky blue & refreshing open space",
    iconName: "⚡",
    primary: "#1cb0f6",
    primaryDark: "#1899d6",
    primaryWash: "#dff2fe",
    ringColor: "ring-[#1cb0f6]/30",
    pillBg: "bg-[#1cb0f6]/10 text-[#1899d6] dark:text-[#1cb0f6] border-[#1cb0f6]/30",
    badgeBorder: "border-[#1899d6]",
    gradientBar: "from-[#1cb0f6] via-[#38c2ff] to-[#00d4b2]",
    buttonClass: "bg-[#1cb0f6] hover:bg-[#2dc0ff] text-white border-2 border-[#1899d6] border-b-4 border-b-[#127ea8] active:border-b-2 active:translate-y-[2px]",
    activeRadioClass: "bg-[#1cb0f6] text-white border-2 border-[#1899d6] border-b-4 border-b-[#127ea8] shadow-md ring-4 ring-[#1cb0f6]/25",
  },
  "sunny-amber": {
    id: "sunny-amber",
    name: "Warm Horizon",
    subtitle: "Uplifting sunrise glow & encouraging focus",
    iconName: "☀️",
    primary: "#ff9600",
    primaryDark: "#d97e00",
    primaryWash: "#ffeed6",
    ringColor: "ring-[#ff9600]/30",
    pillBg: "bg-[#ff9600]/10 text-[#d97e00] dark:text-[#ff9600] border-[#ff9600]/30",
    badgeBorder: "border-[#d97e00]",
    gradientBar: "from-[#ff9600] via-[#ffa726] to-[#ffca28]",
    buttonClass: "bg-[#ff9600] hover:bg-[#ffa71a] text-white border-2 border-[#d97e00] border-b-4 border-b-[#b86b00] active:border-b-2 active:translate-y-[2px]",
    activeRadioClass: "bg-[#ff9600] text-white border-2 border-[#d97e00] border-b-4 border-b-[#b86b00] shadow-md ring-4 ring-[#ff9600]/25",
  },
};

export const ADMIN_AVAILABLE_THEMES: AssessmentThemeConfig[] = Object.values(ASSESSMENT_THEMES);

const ADMIN_DEFAULT_THEME_KEY = "jaagr_admin_checkin_theme";
let currentTheme: AssessmentThemeId = "duo-green";
const listeners = new Set<() => void>();

function getSnapshot(): AssessmentThemeId {
  if (typeof window !== "undefined") {
    try {
      // Check URL param first if present on the page
      const searchParams = new URLSearchParams(window.location.search);
      const urlTheme = searchParams.get("theme") as AssessmentThemeId | null;
      if (urlTheme && ASSESSMENT_THEMES[urlTheme]) {
        currentTheme = urlTheme;
        return currentTheme;
      }

      // Check admin configured default
      const stored = localStorage.getItem(ADMIN_DEFAULT_THEME_KEY) as AssessmentThemeId | null;
      if (stored && ASSESSMENT_THEMES[stored]) {
        currentTheme = stored;
      }
    } catch {
      // fallback
    }
  }
  return currentTheme;
}

function getServerSnapshot(): AssessmentThemeId {
  return "duo-green";
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setAssessmentTheme(id: AssessmentThemeId) {
  if (ASSESSMENT_THEMES[id]) {
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

export function useAssessmentTheme(overrideThemeId?: AssessmentThemeId) {
  const storeThemeId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const activeId = overrideThemeId && ASSESSMENT_THEMES[overrideThemeId] ? overrideThemeId : storeThemeId;

  return {
    currentThemeId: activeId,
    theme: ASSESSMENT_THEMES[activeId] || ASSESSMENT_THEMES["duo-green"],
    setThemeId: setAssessmentTheme,
  };
}
