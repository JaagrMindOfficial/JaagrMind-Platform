"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AssessmentThemeId } from "@/lib/assessment-theme";
import { MascotCharacterRig } from "./mascot-character-rig";
import { MascotPose, MascotState } from "./mascot-types";
import { Heart } from "lucide-react";

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
  const [bubbleText, setBubbleText] = useState<string | null>("Hey friend! Take a relaxed breath");

  // Assessment card geometry in viewport
  const cardRectRef = useRef<DOMRect | null>(null);

  // Inactivity tracking
  const lastInteractionTimeRef = useRef<number>(Date.now());

  // Prevent conflicting transitions
  const isTransitioningRef = useRef<boolean>(false);

  // Measure card element safely across all portals/routes
  const updateCardMetrics = useCallback(() => {
    if (typeof window === "undefined") return;
    const cardEl =
      document.getElementById("assessment-main-card") ||
      document.querySelector("[data-assessment-main-card='true']") ||
      document.querySelector(".assessment-scenario-card");
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
    const interval = setInterval(updateCardMetrics, 500);
    window.addEventListener("resize", updateCardMetrics);
    window.addEventListener("scroll", updateCardMetrics);

    // Initial position adjustment once mounted (ground garden level)
    const winW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const winH = typeof window !== "undefined" ? window.innerHeight : 800;
    setPos({
      x: Math.max(40, winW * 0.1),
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

      setPose((prev) => ({ ...prev, blinkProgress: 1 }));

      setTimeout(() => {
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
      const breath = Math.sin(elapsed * 1.9) * 0.025;
      const sproutSway = Math.sin(elapsed * 2.4) * 4;

      setPose((prev) => {
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

      // Trigger immediate joyful supportive reaction right where the mascot is!
      setBubbleText("Love the honesty!");

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
      if (progress < 0.3) setBubbleText("No right or wrong — just you!");
      else if (progress < 0.6) setBubbleText("Great reflection! Keep going");
      else if (progress < 0.9) setBubbleText("You're doing wonderfully");
      else setBubbleText("Almost there! Keep it up");

      // Cute curious glance towards question
      setPose((prev) => ({
        ...prev,
        headTilt: 10,
        pupilX: 4,
        pupilY: 3,
        beakExpression: "open",
        leftWingRotate: 24,
      }));

      setTimeout(() => {
        setPose((prev) => ({
          ...prev,
          headTilt: 6,
          pupilX: 2,
          pupilY: 2,
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
      setBubbleText("You completed your check-in! Wonderful job!");
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
  // 4. AUTONOMOUS CHARACTER PLAYGROUND DIRECTOR (Check-in Box & Garden Choreography)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || isCompleted) return;

    let directorTimer: NodeJS.Timeout;
    let stepCount = 0;

    const runDirectorStep = () => {
      if (document.hidden || isTransitioningRef.current) {
        directorTimer = setTimeout(runDirectorStep, 3500);
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

      // Check-in card top-left shoulder coordinates (perched securely on top of the card)
      const cardTopX = card
        ? Math.max(20, card.left + 26)
        : Math.max(70, winW * 0.28);
      const cardTopY = card
        ? Math.max(30, card.top - 94)
        : Math.max(50, winH * 0.18);

      // Inactivity check (>24s without answering)
      if (Date.now() - lastInteractionTimeRef.current > 24000) {
        setMascotState("sleepy_rest");
        setBubbleText("Take all the time you need...");
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

      stepCount++;

      // ───────────────────────────────────────────────────────────────────────
      // ROUTINE A: HOP UP TO CHECK-IN BOX (Primary home spot to "here and see")
      // Executes on mount, every even cycle, or whenever mascot is on ground
      // ───────────────────────────────────────────────────────────────────────
      const shouldBeOnCard = (stepCount % 2 === 1) || mascotState === "idle_ground";

      if (shouldBeOnCard && card) {
        isTransitioningRef.current = true;
        setMascotState("anticipate_jump");
        setBubbleText("Hopping up to see your question!");

        // 1. Crouch down in anticipation
        setPose((prev) => ({
          ...prev,
          scaleX: 1,
          scaleY: 0.8,
          headTilt: -8,
          pupilY: -5,
          leftWingRotate: -15,
          rightWingRotate: 15,
        }));

        // 2. Launch upward arc onto card top!
        setTimeout(() => {
          setMascotState("jump_to_card");
          setPose((prev) => ({
            ...prev,
            scaleY: 1.25,
            scaleX: 0.92,
            leftWingRotate: 45,
            rightWingRotate: -45,
            pupilY: -3,
            leftLegY: -6,
            rightLegY: -6,
          }));
          // Move spring position to card shoulder
          setPos({ x: cardTopX, y: cardTopY, zIndex: 60 });

          // 3. Land on top of check-in card
          setTimeout(() => {
            setMascotState("land_on_card");
            // Landing compression
            setPose((prev) => ({
              ...prev,
              scaleY: 0.86,
              scaleX: 1.08,
              leftWingRotate: 10,
              rightWingRotate: -10,
              leftLegY: 0,
              rightLegY: 0,
              eyeExpression: "happy",
              beakExpression: "smile",
            }));

            // 4. Settle on card and look down curiously into the question ("here and see")
            setTimeout(() => {
              setMascotState("look_down_question");
              setBubbleText("I see your question! Take your time");
              setPose((prev) => ({
                ...prev,
                scaleY: 1,
                scaleX: 1,
                headTilt: 12, // Curiously tilted down towards the question
                pupilY: 4,   // Eyes looking down at statement
                pupilX: 3,
                eyeExpression: "curious",
                beakExpression: "smile",
                leftWingRotate: 0,
                rightWingRotate: 0,
              }));

              // 5. Friendly greeting/wave from the top of the card
              setTimeout(() => {
                setMascotState("sit_on_card");
                setBubbleText("You're doing great!");
                setPose((prev) => ({
                  ...prev,
                  headTilt: 6,
                  pupilY: 2,
                  pupilX: 1,
                  eyeExpression: "happy",
                  beakExpression: "smile",
                  leftWingRotate: 36, // Wave wing to student
                }));

                // Mascot remains perched on the card for 7.5 seconds observing and interacting!
                setTimeout(() => {
                  isTransitioningRef.current = false;
                }, 4000);
              }, 3000);
            }, 550);
          }, 650);
        }, 450);

        // Allow ample time to perch and be interactive before next action
        directorTimer = setTimeout(runDirectorStep, 9000);
        return;
      }

      // ───────────────────────────────────────────────────────────────────────
      // ROUTINE B: HOP DOWN TO GARDEN FOR ADD-ON MOVEMENTS (Leaves, Strolls, Cheer)
      // ───────────────────────────────────────────────────────────────────────
      isTransitioningRef.current = true;
      setMascotState("jump_down_ground");
      setBubbleText("Checking the garden leaves!");

      // 1. Crouch to jump down
      setPose((prev) => ({
        ...prev,
        scaleY: 0.82,
        scaleX: -1, // Face towards garden
        leftWingRotate: 20,
        rightWingRotate: -20,
        headTilt: -6,
      }));

      // 2. Leap down to ground
      setTimeout(() => {
        setPose((prev) => ({
          ...prev,
          scaleY: 1.2,
          scaleX: -1,
          leftWingRotate: 42,
          rightWingRotate: -42,
          pupilY: 4,
          headTilt: -8,
        }));
        setPos({ x: groundX, y: groundY, zIndex: 50 });

        // 3. Soft landing on grass
        setTimeout(() => {
          setPose((prev) => ({
            ...prev,
            scaleY: 0.88,
            scaleX: -1,
            leftWingRotate: 0,
            rightWingRotate: 0,
            eyeExpression: "normal",
            beakExpression: "normal",
            headTilt: 0,
            pupilY: 0,
          }));

          setTimeout(() => {
            setPose((prev) => ({ ...prev, scaleY: 1 }));

            // Decide add-on movement: Leaf physics OR Garden stroll
            const addOnRoll = Math.random();

            if (addOnRoll < 0.5) {
              // ADD-ON 1: Plant & Leaf Physics Interaction (Leaf bends physically!)
              setMascotState("inspect_leaf");
              setBubbleText("Checking on the garden leaves");
              setPos({ x: Math.max(20, groundX - 35), y: groundY, zIndex: 50 });
              setPose((prev) => ({
                ...prev,
                scaleX: -1,
                headTilt: -8,
                pupilX: -4,
                pupilY: 2,
                beakExpression: "open",
                leftWingRotate: 36, // Reach wing out to touch leaf
              }));

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
                    isTransitioningRef.current = false;
                  }, 1200);
                }, 600);
              }, 800);
            } else {
              // ADD-ON 2: Playful Garden Stroll & Little Hops
              setMascotState("walk_in_grass");
              setBubbleText("Enjoying the garden breeze");
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

                setTimeout(() => {
                  setBubbleText("Take your time, friend!");
                  setPose((prev) => ({
                    ...prev,
                    scaleY: 1,
                    headTilt: 6,
                    pupilX: 3,
                    pupilY: 1,
                    beakExpression: "smile",
                    eyeExpression: "happy",
                  }));

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
                    isTransitioningRef.current = false;
                  }, 1600);
                }, 800);
              }, 500);
            }
          }, 350);
        }, 650);
      }, 450);

      directorTimer = setTimeout(runDirectorStep, 7800);
    };

    // Start with a brief delay, then jump right up to the checkin box
    directorTimer = setTimeout(runDirectorStep, 1200);
    return () => clearTimeout(directorTimer);
  }, [isCompleted, onLeafTouch, updateCardMetrics, mascotState]);

  // Click & tap interactivity on the mascot
  const handleMascotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    lastInteractionTimeRef.current = Date.now();

    const quotes = [
      "I'm right here cheering you on!",
      "You're doing wonderful! Keep going",
      "Take a relaxed, deep breath",
      "Every answer is unique to you!",
      "Proud of you for taking this time!",
      "No rush at all, friend!",
    ];
    setBubbleText(quotes[Math.floor(Math.random() * quotes.length)]);

    // Playful interactive hop & wing wave
    setPose((prev) => ({
      ...prev,
      eyeExpression: "happy",
      beakExpression: "smile",
      leftWingRotate: 42,
      rightWingRotate: -42,
      bodyYOffset: -16,
      scaleY: 1.18,
    }));

    setTimeout(() => {
      setPose((prev) => ({
        ...prev,
        bodyYOffset: 0,
        scaleY: 0.9,
        leftWingRotate: 12,
        rightWingRotate: -12,
      }));
      setTimeout(() => {
        setPose((prev) => ({
          ...prev,
          scaleY: 1,
          leftWingRotate: 0,
          rightWingRotate: 0,
        }));
      }, 250);
    }, 350);
  };

  // Don't render until mounted in browser DOM
  if (!mounted || typeof document === "undefined") return null;

  // Render directly to document.body via Portal to prevent CSS stacking-context trapping
  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 60 }}
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
          width: 105,
          height: 105,
        }}
        onClick={handleMascotClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        className="relative pointer-events-auto cursor-pointer z-60 group flex items-end justify-center"
      >
        {/* Floating Contextual Speech Bubble (Always pinned above head, does not shift mascot) */}
        <AnimatePresence mode="wait">
          {bubbleText && (
            <motion.div
              key={bubbleText}
              initial={{ opacity: 0, y: 6, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.9 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-300 dark:border-slate-600 shadow-xl text-xs font-bold text-slate-800 dark:text-slate-100 text-center min-w-[140px] max-w-[220px] whitespace-normal select-none pointer-events-none z-60 flex items-center justify-center gap-1.5"
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
          size={105}
        />
      </motion.div>
    </div>,
    document.body
  );
}
