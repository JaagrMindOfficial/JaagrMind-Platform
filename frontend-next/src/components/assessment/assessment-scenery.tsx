"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AssessmentThemeId } from "@/lib/assessment-theme";
import { MascotDirector } from "./mascot/mascot-director";

interface AssessmentSceneryProps {
  themeId: AssessmentThemeId;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer?: any;
  isCompleted?: boolean;
}

export function AssessmentScenery({
  themeId,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  isCompleted = false,
}: AssessmentSceneryProps) {
  // Leaf secondary physics triggered when mascot interacts with the plant
  const [leafBent, setLeafBent] = useState(false);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* ─────────────────────────────────────────────────────────────
          1. THEME-ADAPTIVE AMBIENT BACKGROUND GRADIENT WASH
      ────────────────────────────────────────────────────────────── */}
      {themeId === "duo-green" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#f2fcf2] via-background to-[#f0fbf0] opacity-80" />
      )}
      {themeId === "spark-blue" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#f0f9ff] via-background to-[#eaf5fd] opacity-80" />
      )}
      {themeId === "sunny-amber" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#fffbf0] via-background to-[#fff7e6] opacity-80" />
      )}

      {/* Ambient background decorative floating color orbs */}
      <div
        className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-30 transition-colors duration-700 ${
          themeId === "duo-green"
            ? "bg-[#58cc02]"
            : themeId === "spark-blue"
            ? "bg-[#1cb0f6]"
            : "bg-[#ff9600]"
        }`}
      />
      <div
        className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-25 transition-colors duration-700 ${
          themeId === "duo-green"
            ? "bg-[#8adf56]"
            : themeId === "spark-blue"
            ? "bg-[#00cd9c]"
            : "bg-[#ffc800]"
        }`}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. UPPER FLOATING SKY SCENERY
      ────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block absolute top-3 inset-x-0 h-24 pointer-events-none select-none">
        {/* UPPER LEFT: One drifting cloud and two tiny sparkles */}
        <div className="absolute top-2 left-[6%] flex items-center pointer-events-none">
          {/* One drifting cloud */}
          <motion.div
            animate={{ x: [0, 20, 0], y: [0, -3.5, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="opacity-60"
          >
            <svg width="115" height="46" viewBox="0 0 110 45" fill="none">
              <path
                d="M20 38h70a14 14 0 0011-23 18 18 0 00-33-7 14 14 0 00-24 4 13 13 0 00-24 26z"
                fill={themeId === "spark-blue" ? "#d5f2ff" : themeId === "sunny-amber" ? "#ffeed5" : "#e6f8dc"}
                className="dark:opacity-20"
              />
            </svg>
          </motion.div>

          {/* Sparkle 1 */}
          <motion.div
            animate={{ scale: [0.75, 1.25, 0.75], opacity: [0.35, 0.95, 0.35] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="ml-3 -mt-3 text-sm select-none"
          >
            ✨
          </motion.div>

          {/* Sparkle 2 */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.85, 0.3] }}
            transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            className="ml-4 mt-4 text-xs select-none"
          >
            ⭐
          </motion.div>
        </div>

        {/* UPPER RIGHT: Two tiny birds replacing the kite, with gentle wing movement */}
        <div className="absolute top-4 right-[14%] flex items-start gap-3 pointer-events-none">
          {/* Bird 1 */}
          <motion.div
            animate={{
              x: [0, -14, 0],
              y: [0, -5, 0],
            }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative text-[#5a8e7d] dark:text-[#7bb5a2] opacity-80"
          >
            <motion.svg
              width="26"
              height="20"
              viewBox="0 0 36 28"
              fill="currentColor"
              animate={{
                scaleY: [1, 0.32, 1],
                rotate: [-1, 2, -1],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "center center" }}
            >
              <path d="M2 13 C 8 7, 16 1, 24 0 C 22 6, 21 10, 26 12 C 30 13, 35 12, 36 14 C 31 16, 26 17, 22 18 C 18 20, 16 27, 13 28 C 14 22, 12 19, 8 18 C 4 17, 1 15, 2 13 Z" />
            </motion.svg>
          </motion.div>

          {/* Bird 2 (Following slightly behind with offset flapping) */}
          <motion.div
            animate={{
              x: [0, -12, 0],
              y: [0, -4, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="mt-3.5 relative text-[#669888] dark:text-[#83bea9] opacity-75"
          >
            <motion.svg
              width="20"
              height="15"
              viewBox="0 0 36 28"
              fill="currentColor"
              animate={{
                scaleY: [1, 0.35, 1],
                rotate: [1, -2, 1],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.35,
              }}
              style={{ transformOrigin: "center center" }}
            >
              <path d="M2 13 C 8 7, 16 1, 24 0 C 22 6, 21 10, 26 12 C 30 13, 35 12, 36 14 C 31 16, 26 17, 22 18 C 18 20, 16 27, 13 28 C 14 22, 12 19, 8 18 C 4 17, 1 15, 2 13 Z" />
            </motion.svg>
          </motion.div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. LIVING CHARACTER ANIMATION DIRECTOR & PLAYGROUND CONTROLLER
      ────────────────────────────────────────────────────────────── */}
      <MascotDirector
        themeId={themeId}
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
        selectedAnswer={selectedAnswer}
        isCompleted={isCompleted}
        onLeafTouch={setLeafBent}
      />

      {/* ─────────────────────────────────────────────────────────────
          4. LOWER LEFT: BOTANICAL GARDEN WITH SPACE FOR MASCOT TO WALK & INTERACT
      ────────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col justify-end absolute left-0 bottom-0 w-56 sm:w-64 lg:w-72 xl:w-80 pointer-events-none z-10 select-none">
        <motion.div
          animate={{
            rotate: leafBent ? [0, 4, -2, 0] : [-1.5, 1.8, -1.5],
            scale: leafBent ? [1, 1.03, 1] : [1, 1.012, 1],
          }}
          transition={{
            duration: leafBent ? 0.7 : 7.5,
            repeat: leafBent ? 0 : Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "bottom left" }}
          className="relative w-full drop-shadow-md select-none"
        >
          <img
            src="/images/botanical-foliage.png"
            alt="Botanical Foliage"
            className="w-full h-auto max-h-[360px] object-contain object-bottom pointer-events-none select-none"
            draggable={false}
          />
        </motion.div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. LOWER RIGHT: PLANTS WITH BUTTERFLY & FIREFLY ACTIVITY
      ────────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col justify-end items-end absolute right-0 bottom-0 w-56 sm:w-64 lg:w-72 xl:w-80 pointer-events-none z-10 select-none">
        {/* Occasional Playful Butterfly fluttering around plants */}
        <motion.div
          animate={{
            x: [0, -20, -42, -26, 0],
            y: [0, -24, -10, -32, 0],
            rotate: [0, -10, 8, -6, 0],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-52 right-32 pointer-events-none z-20"
        >
          <motion.div
            animate={{
              scaleX: [1, 0.22, 1],
            }}
            transition={{
              duration: 0.32,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-6 h-6 drop-shadow-sm flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#f59e0b] dark:fill-[#fbbf24]">
              <path d="M12 9 C10 4, 3 3, 2 8 C 1 12, 7 15, 11 13 L12 14 L13 13 C17 15, 23 12, 22 8 C 21 3, 14 4, 12 9 Z" opacity="0.92" />
              <path d="M11 13 C8 15, 4 17, 5 21 C 6 23, 10 21, 12 16 L12 16 L12 16 C14 21, 18 23, 19 21 C 20 17, 16 15, 13 13 Z" opacity="0.8" fill="#fbbf24" />
              <ellipse cx="12" cy="13" rx="0.9" ry="3.5" fill="#78350f" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Occasional Glowing Fireflies near foliage */}
        <motion.div
          animate={{
            opacity: [0.15, 0.95, 0.2],
            scale: [0.75, 1.25, 0.75],
            y: [0, -14, 0],
            x: [0, 6, 0],
          }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-44 right-24 w-2 h-2 rounded-full bg-[#fde047] shadow-[0_0_8px_#facc15] pointer-events-none z-20"
        />
        <motion.div
          animate={{
            opacity: [0.1, 0.85, 0.15],
            scale: [0.65, 1.15, 0.65],
            y: [0, -18, 0],
            x: [0, -7, 0],
          }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
          className="absolute bottom-60 right-48 w-1.5 h-1.5 rounded-full bg-[#86efac] shadow-[0_0_8px_#4ade80] pointer-events-none z-20"
        />
        <motion.div
          animate={{
            opacity: [0.2, 1, 0.3],
            scale: [0.8, 1.35, 0.8],
            y: [0, -10, 0],
            x: [0, 8, 0],
          }}
          transition={{ duration: 3.9, repeat: Infinity, ease: "easeInOut", delay: 2.7 }}
          className="absolute bottom-36 right-56 w-2 h-2 rounded-full bg-[#fef08a] shadow-[0_0_8px_#fde047] pointer-events-none z-20"
        />

        {/* Right Botanical Foliage */}
        <motion.div
          animate={{
            rotate: [1.5, -1.8, 1.5],
            scale: [1, 1.012, 1],
          }}
          transition={{
            duration: 8.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          style={{ transformOrigin: "bottom right" }}
          className="relative w-full drop-shadow-md select-none flex justify-end"
        >
          <img
            src="/images/botanical-foliage-right.png"
            alt="Botanical Foliage"
            className="w-full h-auto max-h-[360px] object-contain object-bottom pointer-events-none select-none"
            draggable={false}
          />
        </motion.div>
      </div>
    </div>
  );
}
