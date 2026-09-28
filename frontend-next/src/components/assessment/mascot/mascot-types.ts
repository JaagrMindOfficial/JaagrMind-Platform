"use client";

import { AssessmentThemeId } from "@/lib/assessment-theme";

export type MascotState =
  | "idle_ground"
  | "curious_look"
  | "walk_in_grass"
  | "inspect_leaf"
  | "anticipate_jump"
  | "jump_to_card"
  | "land_on_card"
  | "walk_on_card"
  | "look_down_question"
  | "sit_on_card"
  | "peek_card_top"
  | "jump_down_ground"
  | "celebrate_answer"
  | "celebrate_finish"
  | "sleepy_rest";

export type EyeExpression =
  | "normal"
  | "happy"
  | "curious"
  | "sleepy"
  | "wide"
  | "blink"
  | "wink";

export type BeakExpression = "normal" | "open" | "smile" | "gasp";

export interface MascotPose {
  // Locomotion & Body
  scaleX: number; // 1 = facing right, -1 = facing left (with squash/stretch scale multiplier)
  scaleY: number; // 1 = normal, 0.82 = squash, 1.18 = stretch
  bodyRotate: number; // degrees
  headTilt: number; // head angle degrees
  bodyYOffset: number; // step bounce px

  // Facial Rig
  eyeExpression: EyeExpression;
  pupilX: number; // -6 to +6 px
  pupilY: number; // -5 to +5 px
  blinkProgress: number; // 0 = open, 1 = shut
  eyeScale: number; // 1 = normal, 1.2 = wide

  // Mouth / Beak
  beakExpression: BeakExpression;

  // Arms / Wings
  leftWingRotate: number; // degrees
  rightWingRotate: number; // degrees
  leftWingY: number;
  rightWingY: number;

  // Legs & Feet
  leftLegY: number;
  leftLegRotate: number;
  rightLegY: number;
  rightLegRotate: number;

  // Head Feather / Sprout
  sproutRotate: number;

  // Grounding Shadow
  shadowScale: number;
  shadowOpacity: number;
}

export interface MascotThemeColors {
  bodyFill: string;
  bodyStroke: string;
  bellyFill: string;
  wingFill: string;
  beakFill: string;
  feetFill: string;
  cheekFill: string;
  sproutLeft: string;
  sproutRight: string;
}

export const MASCOT_THEME_COLORS: Record<AssessmentThemeId, MascotThemeColors> = {
  "duo-green": {
    bodyFill: "#58cc02",
    bodyStroke: "#000437",
    bellyFill: "#d7ffb8",
    wingFill: "#46a302",
    beakFill: "#ffc800",
    feetFill: "#ffc800",
    cheekFill: "#ff7f7f",
    sproutLeft: "#7ce539",
    sproutRight: "#a5ed6e",
  },
  "spark-blue": {
    bodyFill: "#1cb0f6",
    bodyStroke: "#000437",
    bellyFill: "#d5f2ff",
    wingFill: "#1899d6",
    beakFill: "#ffc800",
    feetFill: "#ffc800",
    cheekFill: "#ff7f7f",
    sproutLeft: "#38c2ff",
    sproutRight: "#70d5ff",
  },
  "sunny-amber": {
    bodyFill: "#ff9600",
    bodyStroke: "#000437",
    bellyFill: "#ffeed5",
    wingFill: "#d97e00",
    beakFill: "#ffc800",
    feetFill: "#ffb300",
    cheekFill: "#ff7f7f",
    sproutLeft: "#ffa726",
    sproutRight: "#ffca28",
  },
};
