"use client";

import React from "react";
import { motion } from "framer-motion";
import { AssessmentThemeId } from "@/lib/assessment-theme";
import {
  MascotPose,
  MASCOT_THEME_COLORS,
} from "./mascot-types";

interface MascotCharacterRigProps {
  pose: MascotPose;
  themeId: AssessmentThemeId;
  size?: number; // width in px, default 120
  className?: string;
}

export function MascotCharacterRig({
  pose,
  themeId,
  size = 120,
  className = "",
}: MascotCharacterRigProps) {
  const colors = MASCOT_THEME_COLORS[themeId] || MASCOT_THEME_COLORS["duo-green"];

  // Eyelid path calculations for smooth blinking
  // Eye centers are at (44, 54) and (76, 54), radius 13
  const blinkClamp = Math.min(1, Math.max(0, pose.blinkProgress));
  // Top eyelid drop: -13 (fully open) to +13 (fully closed)
  const eyelidY = 41 + blinkClamp * 26;

  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      style={{
        width: size,
        height: size * 1.05,
      }}
    >
      <svg
        viewBox="0 0 120 126"
        className="w-full h-full overflow-visible drop-shadow-md"
      >
        <defs>
          {/* Clip path for left eye blinking */}
          <clipPath id="mascot-left-eye-clip">
            <circle cx="44" cy="54" r="13" />
          </clipPath>
          {/* Clip path for right eye blinking */}
          <clipPath id="mascot-right-eye-clip">
            <circle cx="76" cy="54" r="13" />
          </clipPath>
        </defs>

        {/* ─────────────────────────────────────────────────────────────
            1. GROUND DROP SHADOW (Reacts to height & jump physics)
        ────────────────────────────────────────────────────────────── */}
        <ellipse
          cx="60"
          cy="120"
          rx={Math.max(6, 26 * pose.shadowScale)}
          ry={Math.max(2, 6 * pose.shadowScale)}
          fill="#000437"
          opacity={Math.max(0.04, 0.22 * pose.shadowOpacity)}
        />

        {/* ─────────────────────────────────────────────────────────────
            2. ARTICULATED MASCOT ROOT (Squash, Stretch, Bob & Facing)
        ────────────────────────────────────────────────────────────── */}
        <motion.g
          animate={{
            scaleX: pose.scaleX,
            scaleY: pose.scaleY,
            rotate: pose.bodyRotate,
            y: pose.bodyYOffset,
          }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 24,
            mass: 0.6,
          }}
          style={{ transformOrigin: "60px 112px" }}
        >
          {/* ─────────────────────────────────────────────────────────────
              3. ARTICULATED LEGS & FEET (Walk cycles, Dangling & Jumps)
          ────────────────────────────────────────────────────────────── */}
          {/* Left Foot */}
          <motion.g
            animate={{
              y: pose.leftLegY,
              rotate: pose.leftLegRotate,
            }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            style={{ transformOrigin: "46px 106px" }}
          >
            {/* Ankle connector */}
            <path
              d="M44 104 L44 112 L48 112 L48 104 Z"
              fill={colors.feetFill}
              stroke={colors.bodyStroke}
              strokeWidth="2.5"
            />
            {/* Foot Pad */}
            <ellipse
              cx="46"
              cy="114"
              rx="9"
              ry="4.5"
              fill={colors.feetFill}
              stroke={colors.bodyStroke}
              strokeWidth="2.5"
            />
          </motion.g>

          {/* Right Foot */}
          <motion.g
            animate={{
              y: pose.rightLegY,
              rotate: pose.rightLegRotate,
            }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            style={{ transformOrigin: "74px 106px" }}
          >
            {/* Ankle connector */}
            <path
              d="M72 104 L72 112 L76 112 L76 104 Z"
              fill={colors.feetFill}
              stroke={colors.bodyStroke}
              strokeWidth="2.5"
            />
            {/* Foot Pad */}
            <ellipse
              cx="74"
              cy="114"
              rx="9"
              ry="4.5"
              fill={colors.feetFill}
              stroke={colors.bodyStroke}
              strokeWidth="2.5"
            />
          </motion.g>

          {/* ─────────────────────────────────────────────────────────────
              4. MAIN BODY & BELLY (Chubby Egg Silhouette)
          ────────────────────────────────────────────────────────────── */}
          {/* Torso */}
          <ellipse
            cx="60"
            cy="68"
            rx="42"
            ry="45"
            fill={colors.bodyFill}
            stroke={colors.bodyStroke}
            strokeWidth="4"
          />

          {/* Soft Belly Patch */}
          <ellipse
            cx="60"
            cy="76"
            rx="28"
            ry="29"
            fill={colors.bellyFill}
          />

          {/* Rosy Cheeks */}
          <circle
            cx="33"
            cy="68"
            r="6"
            fill={colors.cheekFill}
            opacity="0.65"
          />
          <circle
            cx="87"
            cy="68"
            r="6"
            fill={colors.cheekFill}
            opacity="0.65"
          />

          {/* ─────────────────────────────────────────────────────────────
              5. ARTICULATED HEAD & EYES RIG
          ────────────────────────────────────────────────────────────── */}
          <motion.g
            animate={{ rotate: pose.headTilt }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            style={{ transformOrigin: "60px 65px" }}
          >
            {/* HEAD SPROUT / FEATHER (With Secondary Physics Jiggle) */}
            <motion.g
              animate={{ rotate: pose.sproutRotate }}
              transition={{ type: "spring", stiffness: 280, damping: 14 }}
              style={{ transformOrigin: "60px 23px" }}
            >
              {/* Left Sprout Leaf */}
              <path
                d="M60 23 C55 10, 42 13, 44 5 C53 5, 59 16, 60 23 Z"
                fill={colors.sproutLeft}
                stroke={colors.bodyStroke}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {/* Right Sprout Leaf */}
              <path
                d="M60 23 C65 12, 75 14, 73 6 C65 7, 61 17, 60 23 Z"
                fill={colors.sproutRight}
                stroke={colors.bodyStroke}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {/* Central stem node */}
              <circle cx="60" cy="23" r="2.5" fill={colors.bodyStroke} />
            </motion.g>

            {/* ─── EYES ─── */}
            {pose.eyeExpression === "happy" ? (
              /* Joyful Duolingo-style Happy Crescent Eyes: ^ ^ */
              <g>
                <path
                  d="M 33 56 Q 44 43, 55 56"
                  stroke={colors.bodyStroke}
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 65 56 Q 76 43, 87 56"
                  stroke={colors.bodyStroke}
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            ) : (
              /* Standard / Animated Eyes with Pupils & Eyelid Overlay */
              <g transform={`scale(${pose.eyeScale})`} style={{ transformOrigin: "60px 54px" }}>
                {/* Left Eye Sclera */}
                <circle
                  cx="44"
                  cy="54"
                  r="13"
                  fill="#ffffff"
                  stroke={colors.bodyStroke}
                  strokeWidth="3.5"
                />
                {/* Left Pupil + Specular Sparkle (Clipped inside eye) */}
                <g clipPath="url(#mascot-left-eye-clip)">
                  <motion.circle
                    animate={{
                      cx: 44 + pose.pupilX,
                      cy: 54 + pose.pupilY,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    r="6.5"
                    fill={colors.bodyStroke}
                  />
                  {/* Primary highlight shine */}
                  <motion.circle
                    animate={{
                      cx: 44 + pose.pupilX + 2.2,
                      cy: 54 + pose.pupilY - 2.2,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    r="2.5"
                    fill="#ffffff"
                  />
                  {/* Tiny secondary sparkle */}
                  <motion.circle
                    animate={{
                      cx: 44 + pose.pupilX - 2.2,
                      cy: 54 + pose.pupilY + 2.2,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    r="1.2"
                    fill="#ffffff"
                    opacity="0.8"
                  />
                  {/* Left Animated Eyelid Dropping Over Eye */}
                  {blinkClamp > 0.05 && (
                    <rect
                      x="28"
                      y="38"
                      width="32"
                      height={eyelidY - 38}
                      fill={colors.bodyFill}
                      stroke={colors.bodyStroke}
                      strokeWidth="2.5"
                    />
                  )}
                </g>

                {/* Right Eye Sclera */}
                <circle
                  cx="76"
                  cy="54"
                  r="13"
                  fill="#ffffff"
                  stroke={colors.bodyStroke}
                  strokeWidth="3.5"
                />
                {/* Right Pupil + Specular Sparkle */}
                <g clipPath="url(#mascot-right-eye-clip)">
                  <motion.circle
                    animate={{
                      cx: 76 + pose.pupilX,
                      cy: 54 + pose.pupilY,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    r="6.5"
                    fill={colors.bodyStroke}
                  />
                  <motion.circle
                    animate={{
                      cx: 76 + pose.pupilX + 2.2,
                      cy: 54 + pose.pupilY - 2.2,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    r="2.5"
                    fill="#ffffff"
                  />
                  <motion.circle
                    animate={{
                      cx: 76 + pose.pupilX - 2.2,
                      cy: 54 + pose.pupilY + 2.2,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    r="1.2"
                    fill="#ffffff"
                    opacity="0.8"
                  />
                  {/* Right Animated Eyelid Dropping Over Eye */}
                  {blinkClamp > 0.05 && (
                    <rect
                      x="60"
                      y="38"
                      width="32"
                      height={eyelidY - 38}
                      fill={colors.bodyFill}
                      stroke={colors.bodyStroke}
                      strokeWidth="2.5"
                    />
                  )}
                </g>
              </g>
            )}

            {/* ─── BEAK / MOUTH ─── */}
            {pose.beakExpression === "open" || pose.beakExpression === "smile" ? (
              <g>
                {/* Open Mouth Cavity with Tongue */}
                <path
                  d="M52 64 Q60 74, 68 64 Z"
                  fill="#990000"
                  stroke={colors.bodyStroke}
                  strokeWidth="2.5"
                />
                <ellipse cx="60" cy="67" rx="4.5" ry="2.5" fill="#ff7f7f" />
                {/* Upper Beak */}
                <polygon
                  points="60,57 52,64 68,64"
                  fill={colors.beakFill}
                  stroke={colors.bodyStroke}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </g>
            ) : pose.beakExpression === "gasp" ? (
              <g>
                {/* Surprised / Curious O-shaped beak */}
                <polygon
                  points="60,56 53,64 67,64"
                  fill={colors.beakFill}
                  stroke={colors.bodyStroke}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="60" cy="66" r="3.5" fill="#000437" />
              </g>
            ) : (
              /* Standard Closed Triangle Beak */
              <polygon
                points="60,57 53,66 67,66"
                fill={colors.beakFill}
                stroke={colors.bodyStroke}
                strokeWidth="2.8"
                strokeLinejoin="round"
              />
            )}
          </motion.g>

          {/* ─────────────────────────────────────────────────────────────
              6. ARTICULATED WINGS (Waving, Flapping, Resting, Holding)
          ────────────────────────────────────────────────────────────── */}
          {/* Left Wing (Shoulder pivot at 22px, 68px) */}
          <motion.g
            animate={{
              rotate: pose.leftWingRotate,
              y: pose.leftWingY,
            }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 18,
            }}
            style={{ transformOrigin: "22px 68px" }}
          >
            <ellipse
              cx="19"
              cy="69"
              rx="9"
              ry="16"
              fill={colors.wingFill}
              stroke={colors.bodyStroke}
              strokeWidth="3"
            />
          </motion.g>

          {/* Right Wing (Shoulder pivot at 98px, 68px) */}
          <motion.g
            animate={{
              rotate: pose.rightWingRotate,
              y: pose.rightWingY,
            }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 18,
            }}
            style={{ transformOrigin: "98px 68px" }}
          >
            <ellipse
              cx="101"
              cy="69"
              rx="9"
              ry="16"
              fill={colors.wingFill}
              stroke={colors.bodyStroke}
              strokeWidth="3"
            />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}
