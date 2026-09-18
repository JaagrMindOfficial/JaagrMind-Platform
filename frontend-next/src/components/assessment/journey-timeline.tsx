"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX, Sun, BookOpen, Zap, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSoundEnabled, setSoundEnabled } from "@/lib/assessment-sound";
import { useState, useEffect } from "react";

interface JourneyTimelineProps {
  currentIdx: number;
  totalCount: number;
  currentPhase?: string;
}

const STATIONS = [
  { id: "arrival", label: "Arrival", icon: Sun },
  { id: "classroom", label: "Classroom", icon: BookOpen },
  { id: "friction", label: "Pressure", icon: Zap },
  { id: "recharge", label: "Recharge", icon: Moon },
];

export function JourneyTimeline({ currentIdx, totalCount, currentPhase }: JourneyTimelineProps) {
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    setSoundOn(getSoundEnabled());
  }, []);

  const toggleSound = () => {
    const nextState = !soundOn;
    setSoundEnabled(nextState);
    setSoundOn(nextState);
  };

  const progressPercent = totalCount > 0 ? Math.round(((currentIdx + 1) / totalCount) * 100) : 0;
  
  // Estimate station based on question index ratio (0..3)
  const activeStationIdx = totalCount > 0 ? Math.min(3, Math.floor((currentIdx / totalCount) * 4)) : 0;

  return (
    <div className="w-full space-y-3">
      {/* Top Station Bar with Sound Toggle */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {STATIONS.map((stn, idx) => {
            const isActive = idx === activeStationIdx;
            const isDone = idx < activeStationIdx;
            return (
              <div
                key={stn.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : isDone
                    ? "bg-muted/80 text-foreground"
                    : "text-muted-foreground/60 opacity-60"
                }`}
              >
                <stn.icon className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">{stn.label}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={toggleSound}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            title={soundOn ? "Mute tactile chimes" : "Enable tactile chimes"}
          >
            {soundOn ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] hidden md:inline font-mono">Sound ON</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] hidden md:inline font-mono">Muted</span>
              </>
            )}
          </Button>

          <span className="text-[11px] font-mono text-muted-foreground font-medium">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden relative">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-sky-400 rounded-full"
          initial={false}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
