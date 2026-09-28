"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AssessmentThemeId } from "@/lib/assessment-theme";
import { MascotCharacterRig } from "./mascot-character-rig";
import { MascotPose, MascotState } from "./mascot-types";

interface MascotDirectorProps {
  themeId: AssessmentThemeId;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer?: any;
  isCompleted?: boolean;
  onLeafTouch?: (touching: boolean) => void;
}

export function MascotDirector({
  themeId,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  isCompleted = false,
  onLeafTouch,
}: MascotDirectorProps) {
  const [mounted, setMounted] = useState(false);

  // Current high-level state of the mascot
  const [mascotState, setMascotState] = useState<MascotState>("idle_ground");

  // World coordinates (in viewport pixels)
  const [pos, setPos] = useState<{ x: number; y: number; zIndex: number }>({
    x: 80,
    y: 500,
    zIndex: 50,
  });

  // Current pose driving the SVG rig
  const [pose, setPose] = useState<MascotPose>({
    scaleX: 1,
    scaleY: 1,
    bodyRotate: 0,
    headTilt: 0,
    bodyYOffset: 0,
    eyeExpression: "normal",
    pupilX: 0,
    pupilY: 0,
    blinkProgress: 0,
    eyeScale: 1,
    beakExpression: "normal",
    leftWingRotate: 0,
    rightWingRotate: 0,
    leftWingY: 0,
    rightWingY: 0,
    leftLegY: 0,
    leftLegRotate: 0,
    rightLegY: 0,
    rightLegRotate: 0,
    sproutRotate: 0,
    shadowScale: 1,
    shadowOpacity: 1,
  });

  // Dynamic contextual speech bubble text
  const [bubbleText, setBubbleText] = useState<string | null>("Hey friend! Take a relaxed breath 🌱");

  // Assessment card geometry in viewport
  const cardRectRef = useRef<DOMRect | null>(null);

  // Inactivity tracking
  const lastInteractionTimeRef = useRef<number>(Date.now());

  // Prevent conflicting transitions
  const isTransitioningRef = useRef<boolean>(false);

  // Measure card element safely
  const updateCardMetrics = useCallback(() => {
    if (typeof window === "undefined") return;
    const cardEl = document.getElementById("assessment-main-card");
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        cardRectRef.current = rect;
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    updateCardMetrics();

    // Check card metrics frequently to adapt to responsive layouts & steps
    const interval = setInterval(updateCardMetrics, 600);
    window.addEventListener("resize", updateCardMetrics);
    window.addEventListener("scroll", updateCardMetrics);

    // Initial position adjustment once mounted
    const winW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const winH = typeof window !== "undefined" ? window.innerHeight : 800;
    setPos({
      x: Math.max(50, winW * 0.1),
      y: Math.max(300, winH - 180),
      zIndex: 50,
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateCardMetrics);
      window.removeEventListener("scroll", updateCardMetrics);
    };
  }, [updateCardMetrics]);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. NATURAL BLINKING LOOP (Double blinks, normal blinks)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;

    const triggerBlink = () => {
      if (document.hidden) return;

      // Close eyelid smoothly
      setPose((prev) => ({ ...prev, blinkProgress: 1 }));

      setTimeout(() => {
        // Open eyelid
        setPose((prev) => ({ ...prev, blinkProgress: 0 }));

        // Occasional double-blink (25% chance)
        if (Math.random() < 0.25) {
          setTimeout(() => {
            setPose((prev) => ({ ...prev, blinkProgress: 1 }));
            setTimeout(() => {
              setPose((prev) => ({ ...prev, blinkProgress: 0 }));
            }, 90);
          }, 110);
        }
      }, 140);

      // Schedule next blink (between 2.5s and 5.2s)
      const nextDelay = 2500 + Math.random() * 2700;
      blinkTimeout = setTimeout(triggerBlink, nextDelay);
    };

    blinkTimeout = setTimeout(triggerBlink, 1800);
    return () => clearTimeout(blinkTimeout);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. BREATHING & SPROUT JIGGLE (Subtle secondary lifelike physics)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let animFrame: number;
    const startTime = Date.now();

    const loop = () => {
      if (document.hidden) {
        animFrame = requestAnimationFrame(loop);
        return;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      // Gentle breathing wave
      const breath = Math.sin(elapsed * 1.9) * 0.025;
      // Sprout jiggle
      const sproutSway = Math.sin(elapsed * 2.4) * 4;

      setPose((prev) => {
        // Only apply breathing scale when not squashed/stretched by action
        if (prev.scaleY > 0.94 && prev.scaleY < 1.06) {
          return {
            ...prev,
            scaleY: 1 + breath,
            sproutRotate: sproutSway,
          };
        }
        return prev;
      });

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. REACT TO ASSESSMENT EVENTS (Answer Selection, Question Advancement, Completion)
  // ─────────────────────────────────────────────────────────────────────────
  // Reaction on Option Click
  const prevAnswerRef = useRef<any>(selectedAnswer);
  useEffect(() => {
    if (selectedAnswer !== undefined && selectedAnswer !== prevAnswerRef.current) {
      prevAnswerRef.current = selectedAnswer;
      lastInteractionTimeRef.current = Date.now();

      // Trigger immediate joyful supportive reaction!
      setMascotState("celebrate_answer");
      setBubbleText("Love the honesty! ✨");

      setPose((prev) => ({
        ...prev,
        eyeExpression: "happy",
        beakExpression: "smile",
        leftWingRotate: 38,
        rightWingRotate: -38,
        bodyYOffset: -14,
        scaleY: 1.15,
      }));

      // Landing squash recovery
      setTimeout(() => {
        setPose((prev) => ({
          ...prev,
          bodyYOffset: 0,
          scaleY: 0.88,
          leftWingRotate: 16,
          rightWingRotate: -16,
        }));
        setTimeout(() => {
          setPose((prev) => ({
            ...prev,
            scaleY: 1,
            eyeExpression: "normal",
            beakExpression: "normal",
            leftWingRotate: 0,
            rightWingRotate: 0,
          }));
        }, 300);
      }, 350);
    }
  }, [selectedAnswer]);

  // Reaction on Question Progression
  const prevQRef = useRef<number>(questionIndex);
  useEffect(() => {
    if (questionIndex !== prevQRef.current) {
      prevQRef.current = questionIndex;
      lastInteractionTimeRef.current = Date.now();

      const progress = totalQuestions > 0 ? (questionIndex + 1) / totalQuestions : 0;
      if (progress < 0.3) setBubbleText("No right or wrong — just you! 🌱");
      else if (progress < 0.6) setBubbleText("Great reflection! Keep going 🌿");
      else if (progress < 0.9) setBubbleText("You're doing wonderfully 💫");
      else setBubbleText("Almost there! 🌟");

      // Cute curious glance towards question
      setPose((prev) => ({
        ...prev,
        headTilt: 7,
        pupilX: 4,
        pupilY: 2,
        beakExpression: "open",
        leftWingRotate: 24,
      }));

      setTimeout(() => {
        setPose((prev) => ({
          ...prev,
          headTilt: 0,
          pupilX: 0,
          pupilY: 0,
          beakExpression: "normal",
          leftWingRotate: 0,
        }));
      }, 1400);
    }
  }, [questionIndex, totalQuestions]);

  // Reaction on Assessment Completion
  useEffect(() => {
    if (isCompleted) {
      setMascotState("celebrate_finish");
      setBubbleText("YAY! You completed your check-in! 🎉🏆");
      setPose((prev) => ({
        ...prev,
        eyeExpression: "happy",
        beakExpression: "smile",
        leftWingRotate: 45,
        rightWingRotate: -45,
        bodyYOffset: -18,
        scaleY: 1.2,
      }));
    }
  }, [isCompleted]);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. AUTONOMOUS CHARACTER PLAYGROUND DIRECTOR (State Machine)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || isCompleted) return;

    let directorTimer: NodeJS.Timeout;

    const runDirectorStep = () => {
      if (document.hidden || isTransitioningRef.current) {
        directorTimer = setTimeout(runDirectorStep, 4000);
        return;
      }

      updateCardMetrics();
      const card = cardRectRef.current;
      const winW = typeof window !== "undefined" ? window.innerWidth : 1200;
      const winH = typeof window !== "undefined" ? window.innerHeight : 800;

      // Ground coordinates (in left garden area, clear of the card)
      const groundX = card
        ? Math.max(30, Math.min(card.left - 130, winW * 0.14))
        : Math.max(40, winW * 0.1);
      const groundY = Math.max(300, winH - 180);

      // Inactivity check (>22s without answering)
      if (Date.now() - lastInteractionTimeRef.current > 22000) {
        setMascotState("sleepy_rest");
        setBubbleText("Take all the time you need... 💭");
        setPose((prev) => ({
          ...prev,
          eyeExpression: "sleepy",
          beakExpression: "normal",
          headTilt: -6,
          leftWingRotate: 5,
          rightWingRotate: -5,
          leftLegRotate: 0,
          rightLegRotate: 0,
        }));
        directorTimer = setTimeout(runDirectorStep, 7000);
        return;
      }

      // Decide next spontaneous behavior
      const roll = Math.random();

      // BEHAVIOR A: Plant & Leaf Physics Interaction
      if (roll < 0.28) {
        setMascotState("inspect_leaf");
        setBubbleText("Checking on the garden leaves 🌿");
        setPos({ x: Math.max(20, groundX - 35), y: groundY, zIndex: 50 });
        setPose((prev) => ({
          ...prev,
          scaleX: -1, // Turn left towards botanical leaves
          headTilt: -8,
          pupilX: -4,
          pupilY: 2,
          beakExpression: "open",
          leftWingRotate: 36, // Reach wing out to touch leaf
        }));

        // Leaf bends physically!
        setTimeout(() => {
          onLeafTouch?.(true);
          setPose((prev) => ({ ...prev, leftWingRotate: 46, headTilt: -12 }));

          // Leaf springs back!
          setTimeout(() => {
            onLeafTouch?.(false);
            setPose((prev) => ({
              ...prev,
              leftWingRotate: 12,
              headTilt: 4,
              eyeExpression: "happy",
              beakExpression: "smile",
            }));
            setTimeout(() => {
              setPose((prev) => ({
                ...prev,
                eyeExpression: "normal",
                beakExpression: "normal",
                scaleX: 1,
              }));
            }, 1200);
          }, 600);
        }, 800);

        directorTimer = setTimeout(runDirectorStep, 6800);
        return;
      }

      // BEHAVIOR B: Playful Garden Stroll & Little Hops in the lower-left garden
      if (roll < 0.62) {
        setMascotState("anticipate_jump");
        setBubbleText("Enjoying the garden breeze 🌱");

        // 1. Hop across the lower-left garden
        setPos({ x: Math.max(30, groundX + 35), y: groundY - 14, zIndex: 50 });
        setPose((prev) => ({
          ...prev,
          scaleX: 1,
          scaleY: 1.15,
          leftWingRotate: 30,
          rightWingRotate: -30,
          leftLegY: -4,
          rightLegY: -4,
          pupilY: -2,
        }));

        // 2. Land softly on ground
        setTimeout(() => {
          setPos({ x: Math.max(30, groundX + 35), y: groundY, zIndex: 50 });
          setPose((prev) => ({
            ...prev,
            scaleY: 0.9,
            leftWingRotate: 10,
            rightWingRotate: -10,
            leftLegY: 0,
            rightLegY: 0,
          }));

          // 3. Look around happily
          setTimeout(() => {
            setBubbleText("Take your time, friend! 🌿");
            setPose((prev) => ({
              ...prev,
              scaleY: 1,
              headTilt: 6,
              pupilX: 3,
              pupilY: 1,
              beakExpression: "smile",
              eyeExpression: "happy",
            }));

            // 4. Stroll back towards leaves
            setTimeout(() => {
              setPos({ x: groundX, y: groundY, zIndex: 50 });
              setPose((prev) => ({
                ...prev,
                headTilt: 0,
                pupilX: 0,
                pupilY: 0,
                beakExpression: "normal",
                eyeExpression: "normal",
                leftWingRotate: 0,
                rightWingRotate: 0,
              }));
            }, 2600);
          }, 1200);
        }, 500);

        directorTimer = setTimeout(runDirectorStep, 7800);
        return;
      }

      // BEHAVIOR C: Joyful Cheer & Encouragement (Always on TOP layer zIndex: 50!)
      if (roll < 0.82) {
        setMascotState("peek_card_top");
        setBubbleText("You're doing great! Keep going 🌟");

        setPos({ x: groundX, y: groundY - 10, zIndex: 50 });
        setPose((prev) => ({
          ...prev,
          scaleY: 1.08,
          headTilt: 8,
          pupilY: -2,
          pupilX: 2,
          eyeScale: 1.1,
          beakExpression: "smile",
          leftWingRotate: 36, // Friendly wave
        }));

        setTimeout(() => {
          setPos({ x: groundX, y: groundY, zIndex: 50 });
          setPose((prev) => ({
            ...prev,
            headTilt: 0,
            pupilY: 0,
            eyeScale: 1,
            beakExpression: "normal",
            leftWingRotate: 0,
            scaleY: 1,
          }));
        }, 3800);

        directorTimer = setTimeout(runDirectorStep, 7200);
        return;
      }

      // BEHAVIOR D: Ground Idle & Curious Looking Around
      setMascotState("idle_ground");
      setPos({ x: groundX, y: groundY, zIndex: 50 });
      setPose((prev) => ({
        ...prev,
        scaleX: 1,
        scaleY: 1,
        headTilt: Math.random() < 0.5 ? 5 : -5,
        pupilX: Math.random() < 0.5 ? 3 : -3,
        pupilY: 0,
        beakExpression: "normal",
        eyeExpression: "normal",
        leftWingRotate: 0,
        rightWingRotate: 0,
      }));

      directorTimer = setTimeout(runDirectorStep, 5200);
    };

    directorTimer = setTimeout(runDirectorStep, 2000);
    return () => clearTimeout(directorTimer);
  }, [isCompleted, onLeafTouch, updateCardMetrics]);

  // Don't render until mounted in browser DOM
  if (!mounted || typeof document === "undefined") return null;

  // Render directly to document.body via Portal to prevent CSS stacking-context trapping
  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 50 }}
    >
      <motion.div
        animate={{
          x: pos.x,
          y: pos.y,
        }}
        transition={{
          type: "spring",
          stiffness: 110,
          damping: 17,
          mass: 0.9,
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
        className="flex flex-col items-center pointer-events-none z-50"
      >
        {/* Floating Contextual Speech Bubble */}
        <AnimatePresence mode="wait">
          {bubbleText && (
            <motion.div
              key={bubbleText}
              initial={{ opacity: 0, y: 6, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.9 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="mb-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-300 dark:border-slate-600 shadow-xl text-xs font-bold text-slate-800 dark:text-slate-100 text-center max-w-[220px] whitespace-normal relative select-none pointer-events-none z-50"
            >
              <span>{bubbleText}</span>
              {/* Bubble Tail */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-5 border-x-transparent border-t-7 border-t-white dark:border-t-slate-800" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Articulated Mascot Rig */}
        <MascotCharacterRig
          pose={pose}
          themeId={themeId}
          size={110}
        />
      </motion.div>
    </div>,
    document.body
  );
}
