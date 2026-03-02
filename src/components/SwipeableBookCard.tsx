"use client";

import { useCallback, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimate,
  type PanInfo,
} from "motion/react";
import Link from "next/link";
import Image from "next/image";
import GeneratedCover from "@/components/GeneratedCover";
import { STAGES, STAGE_CONFIG } from "@/lib/constants";
import { moveBookToPosition } from "@/lib/books";
import { getSwipeThresholds, shouldConfirm, vibrate } from "@/lib/swipe";
import type { Book } from "@/lib/types";
import { useTranslation } from "@/lib/preferences";

type SwipePhase = "idle" | "dragging" | "peeking" | "confirmed";

// Module-level: track which card is currently peeking so we dismiss it when another opens
let activePeekingId: string | null = null;
let activePeekingDismiss: (() => void) | null = null;

export default function SwipeableBookCard({ book }: { book: Book }) {
  const [phase, setPhase] = useState<SwipePhase>("idle");
  const x = useMotionValue(0);
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const cardWidthRef = useRef(0);
  const [scope, animate] = useAnimate();
  const swipeDirectionRef = useRef<"left" | "right" | null>(null);
  const crossedRevealRef = useRef(false);
  const crossedConfirmRef = useRef(false);
  const baseOffsetRef = useRef(0);

  const stageIndex = STAGES.indexOf(book.stage);
  const canSwipeRight = stageIndex < STAGES.length - 1;
  const canSwipeLeft = stageIndex > 0;
  const nextStage = canSwipeRight ? STAGES[stageIndex + 1] : null;
  const prevStage = canSwipeLeft ? STAGES[stageIndex - 1] : null;

  // Derived motion values for action area
  const actionOpacity = useTransform(x, (latest) => {
    if (cardWidthRef.current === 0) return 0;
    const { deadZone, revealSnap } = getSwipeThresholds(cardWidthRef.current);
    const abs = Math.abs(latest);
    if (abs <= deadZone) return 0;
    return Math.min((abs - deadZone) / (revealSnap - deadZone), 1);
  });

  const dismissToIdle = useCallback(() => {
    setPhase("idle");
    swipeDirectionRef.current = null;
    crossedRevealRef.current = false;
    crossedConfirmRef.current = false;
    baseOffsetRef.current = 0;
    activePeekingDismiss = null;
    activePeekingId = null;
    animate(scope.current, { x: 0 }, { type: "spring", stiffness: 300, damping: 30 });
  }, [animate, scope]);

  const confirmMove = useCallback(
    async (direction: "left" | "right") => {
      const target = direction === "right" ? nextStage : prevStage;
      if (!target) return;

      setPhase("confirmed");
      const cardWidth = cardWidthRef.current || 320;
      const exitX = direction === "right" ? cardWidth + 20 : -(cardWidth + 20);

      await animate(
        scope.current,
        { x: exitX },
        { type: "spring", stiffness: 300, damping: 30 }
      );

      await moveBookToPosition(book.id, target, 0);

      // Reset after move
      x.jump(0);
      setPhase("idle");
      swipeDirectionRef.current = null;
      crossedRevealRef.current = false;
      crossedConfirmRef.current = false;
      activePeekingDismiss = null;
    },
    [animate, scope, book.id, nextStage, prevStage, x]
  );

  const handlePanStart = useCallback(() => {
    // Measure card width on first pan
    if (cardRef.current) {
      cardWidthRef.current = cardRef.current.offsetWidth;
    }
    // Dismiss any OTHER peeking card (not this one)
    if (activePeekingDismiss && activePeekingId !== book.id) {
      activePeekingDismiss();
      activePeekingDismiss = null;
      activePeekingId = null;
    }
    if (phase === "peeking") {
      // Resume from peeking: keep direction, continue from current position
      baseOffsetRef.current = x.get();
      setPhase("dragging");
      crossedRevealRef.current = true; // already past reveal
      crossedConfirmRef.current = false;
    } else {
      baseOffsetRef.current = 0;
      crossedRevealRef.current = false;
      crossedConfirmRef.current = false;
    }
  }, [book.id, phase, x]);

  const handlePan = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const offset = baseOffsetRef.current + info.offset.x;
      const absOffset = Math.abs(offset);
      const width = cardWidthRef.current;
      if (width === 0) return;

      const { deadZone, revealSnap, fullConfirm } = getSwipeThresholds(width);

      // Still in dead zone — don't start (only applies when starting fresh)
      if (absOffset < deadZone && !swipeDirectionRef.current) return;

      // Lock swipe direction on first meaningful move
      if (!swipeDirectionRef.current) {
        const direction = offset > 0 ? "right" : "left";
        // Check if this direction is allowed
        if (direction === "right" && !canSwipeRight) return;
        if (direction === "left" && !canSwipeLeft) return;
        swipeDirectionRef.current = direction;
        setPhase("dragging");
      }

      // Enforce direction lock: ignore movement in wrong direction
      if (swipeDirectionRef.current === "right" && offset < 0) return;
      if (swipeDirectionRef.current === "left" && offset > 0) return;

      // Update card position
      x.set(offset);

      // Haptic at reveal threshold
      if (absOffset >= revealSnap && !crossedRevealRef.current) {
        crossedRevealRef.current = true;
        vibrate(10);
      }

      // Haptic at confirm threshold
      if (absOffset >= fullConfirm && !crossedConfirmRef.current) {
        crossedConfirmRef.current = true;
        vibrate(20);
      }
    },
    [canSwipeRight, canSwipeLeft, x]
  );

  const handlePanEnd = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const direction = swipeDirectionRef.current;
      if (!direction) {
        // Never left the dead zone
        dismissToIdle();
        return;
      }

      const effectiveOffset = baseOffsetRef.current + info.offset.x;
      const absOffset = Math.abs(effectiveOffset);
      const width = cardWidthRef.current;

      // Full confirm: offset past 80%
      if (shouldConfirm(effectiveOffset, width)) {
        confirmMove(direction);
        return;
      }

      const { revealSnap } = getSwipeThresholds(width);

      // Peeking: snap open at 30%
      if (absOffset >= revealSnap) {
        setPhase("peeking");
        const snapX = direction === "right" ? revealSnap : -revealSnap;
        animate(scope.current, { x: snapX }, { type: "spring", stiffness: 300, damping: 30 });
        activePeekingDismiss = dismissToIdle;
        activePeekingId = book.id;
        return;
      }

      // Below reveal threshold: snap back
      dismissToIdle();
    },
    [dismissToIdle, confirmMove, animate, scope, book.id]
  );

  const handleActionTap = useCallback(() => {
    if (phase !== "peeking" || !swipeDirectionRef.current) return;
    confirmMove(swipeDirectionRef.current);
  }, [phase, confirmMove]);

  const handleCardTap = useCallback(() => {
    if (phase === "peeking") {
      dismissToIdle();
    }
  }, [phase, dismissToIdle]);

  // Determine which stage to show in the action area
  const visibleTarget =
    swipeDirectionRef.current === "right"
      ? nextStage
      : swipeDirectionRef.current === "left"
        ? prevStage
        : null;

  return (
    <div ref={cardRef} className="relative overflow-hidden rounded-xl">
      {/* Action area — revealed behind the card */}
      {visibleTarget && (phase === "dragging" || phase === "peeking") && (
        <motion.div
          className={`absolute inset-0 flex items-center rounded-xl ${STAGE_CONFIG[visibleTarget].bgColor} ${
            swipeDirectionRef.current === "right" ? "justify-start pl-4" : "justify-end pr-4"
          }`}
          style={{ opacity: actionOpacity }}
          onTap={handleActionTap}
        >
          <div className="flex flex-col items-center gap-1 overflow-hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={STAGE_CONFIG[visibleTarget].color}
            >
              {swipeDirectionRef.current === "right" ? (
                <>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </>
              ) : (
                <>
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </>
              )}
            </svg>
            <span className="text-base">{STAGE_CONFIG[visibleTarget].emoji}</span>
            <span className={`text-xs font-medium text-center leading-tight whitespace-pre-line ${STAGE_CONFIG[visibleTarget].color}`}>
              {t(STAGE_CONFIG[visibleTarget].swipeLabelKey)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Swipeable card */}
      <motion.div
        ref={scope}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        style={{
          x,
          scale: phase === "dragging" ? 0.98 : 1,
          touchAction: "pan-y",
        }}
        className="relative z-10"
      >
        <Link
          href={`/book/${book.id}`}
          className="group flex gap-3 p-3 rounded-xl bg-surface border border-forest/5 shadow-sm select-none"
          style={{ WebkitTouchCallout: "none" }}
          onClick={(e) => {
            // Prevent navigation during swipe/peeking
            if (phase !== "idle" || Math.abs(x.get()) > 5) {
              e.preventDefault();
              handleCardTap();
            }
          }}
        >
          <div className="relative w-14 h-20 flex-shrink-0 rounded-md overflow-hidden bg-cream">
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                className="object-cover"
                sizes="56px"
                unoptimized
              />
            ) : (
              <GeneratedCover title={book.title} author={book.author} width={56} height={80} />
            )}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h3 className="font-serif text-sm font-semibold text-ink truncate leading-tight">
              {book.title}
            </h3>
            <p className="text-xs text-forest/50 truncate mt-0.5">
              {book.author}
            </p>
            {book.isReading && (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber mt-1" role="img" aria-label={t("book_reading")}>
                <path d="M12 7v14" />
                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
              </svg>
            )}
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
