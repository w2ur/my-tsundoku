"use client";

import { MotionConfig } from "motion/react";

/**
 * The CSS prefers-reduced-motion block in globals.css cannot reach the motion
 * library, which animates via JS (spring physics on card swipe, AnimatePresence
 * in the header). reducedMotion="user" makes those honour the OS setting too.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
