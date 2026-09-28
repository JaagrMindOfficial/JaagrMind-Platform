"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AssessmentThemeId } from "@/lib/assessment-theme";
import { MascotCharacterRig } from "./mascot-character-rig";
import { MascotPose } from "./mascot-types";
import { Handshake, Heart } from "lucide-react";

interface RightMascotCompanionProps {
  themeId: AssessmentThemeId;
  questionIndex: number;
}

export function RightMascotCompanion({
  themeId,
  questionIndex,
}: RightMascotCompanionProps) {
  // Visible state: whether the mascot is peeking up from behind grass
  const [isVisible, setIsVisible] = useState(false);
  const [isHandshaking, setIsHandshaking] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);

  // Handshake pose: facing student (scaleX: -1), front wing extended forward
  const [pose, setPose] = useState<MascotPose>({
    scaleX: -1,
    scaleY: 1,
    bodyRotate: -3,
    headTilt: -5,
    bodyYOffset: 0,
    eyeExpression: "happy",
    pupilX: -3,
    pupilY: 1,
    blinkProgress: 0,
    eyeScale: 1.1,
    beakExpression: "smile",
    leftWingRotate: 64, // Wing extended forward in handshake gesture
    rightWingRotate: -15,
    leftWingY: -4,
    rightWingY: 0,
    leftLegY: 0,
    leftLegRotate: 0,
    rightLegY: 0,
    rightLegRotate: 0,
    sproutRotate: 6,
    shadowScale: 0.8,
    shadowOpacity: 0.7,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isTransitioningRef = useRef<boolean>(false);

  // Autonomous peek & handshake loop
  useEffect(() => {
    const triggerHandshakeAppearance = () => {
      if (document.hidden || isTransitioningRef.current) {
        timerRef.current = setTimeout(triggerHandshakeAppearance, 8000);
        return;
      }

      isTransitioningRef.current = true;

      // 1. Peek up from behind the right grass foliage
      setIsVisible(true);
      setIsHandshaking(true);
      setBubbleText("Hello friend! We're with you!");

      // Handshake pose: outstretched wing shaking gently
      setPose((prev) => ({
        ...prev,
        scaleX: -1,
        eyeExpression: "happy",
        beakExpression: "smile",
        leftWingRotate: 68,
        headTilt: -4,
      }));

      // 2. Friendly handshake motion for 3.5 seconds
      setTimeout(() => {
        // Wave wing in warm greeting
        setBubbleText("You got this!");
        setPose((prev) => ({
          ...prev,
          leftWingRotate: 42,
          headTilt: 4,
        }));

        // 3. Duck back down behind the grass and disappear
        setTimeout(() => {
          setIsVisible(false);
          setIsHandshaking(false);
          setBubbleText(null);
          isTransitioningRef.current = false;

          // Schedule next appearance in 22-30 seconds
          const nextDelay = 22000 + Math.random() * 8000;
          timerRef.current = setTimeout(triggerHandshakeAppearance, nextDelay);
        }, 1600);
      }, 3500);
    };

    // First appearance after 10 seconds of starting assessment
    timerRef.current = setTimeout(triggerHandshakeAppearance, 10000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Quick reaction when question index reaches midway milestones
  const prevQRef = useRef(questionIndex);
  useEffect(() => {
    if (questionIndex !== prevQRef.current && questionIndex > 0 && questionIndex % 4 === 0) {
      prevQRef.current = questionIndex;
      // Bonus encouraging pop-up when reaching every 4th question
      if (!isTransitioningRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        isTransitioningRef.current = true;
        setIsVisible(true);
        setIsHandshaking(true);
        setBubbleText("Great pace! High-five!");
        setPose((prev) => ({
          ...prev,
          scaleX: -1,
          eyeExpression: "happy",
          beakExpression: "smile",
          leftWingRotate: 65,
        }));

        setTimeout(() => {
          setIsVisible(false);
          setIsHandshaking(false);
          setBubbleText(null);
          isTransitioningRef.current = false;
        }, 3600);
      }
    }
  }, [questionIndex]);

  return (
    <div className="absolute right-12 lg:right-20 bottom-10 z-15 pointer-events-none select-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 130, opacity: 0, scale: 0.85 }}
            animate={{
              y: isHandshaking ? [0, -6, 0, -6, 0] : 0,
              opacity: 1,
              scale: 1,
            }}
            exit={{ y: 140, opacity: 0, scale: 0.85 }}
            transition={{
              y: { duration: isHandshaking ? 1.4 : 0.6, repeat: isHandshaking ? Infinity : 0, ease: "easeInOut" },
              opacity: { duration: 0.4 },
              scale: { duration: 0.4 },
            }}
            className="flex flex-col items-center pointer-events-auto cursor-pointer relative"
            onClick={() => {
              setBubbleText("Always here to support you!");
            }}
          >
            {/* Contextual Speech Bubble */}
            <AnimatePresence>
              {bubbleText && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.88 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.9 }}
                  className="absolute bottom-full mb-3 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-300 dark:border-slate-600 shadow-xl text-xs font-bold text-slate-800 dark:text-slate-100 text-center whitespace-nowrap flex items-center gap-1.5 z-30"
                >
                  <Handshake className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{bubbleText}</span>
                  {/* Bubble Tail */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-5 border-x-transparent border-t-7 border-t-white dark:border-t-slate-800" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mascot Character Rig */}
            <MascotCharacterRig
              pose={pose}
              themeId={themeId}
              size={92}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
