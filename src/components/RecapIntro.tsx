"use client";

/**
 * EPIC 6.2 — Skippable time-lapse intro animation
 *
 * Sequence:
 *   Phase 0 (1.4s)  — Boot: VERITAS logo + INITIALISING text
 *   Phase 1 (~Ns)   — Story cards reveal one by one (520ms each)
 *   Phase 2 (2.0s)  — Intelligence summary stats
 *   Phase 3 (0.5s)  — Fade out → onDone
 *
 * Skip: tap anywhere or press any key
 */

import { useEffect, useRef, useCallback, useState } from "react";
import type { RecapSummary } from "@/lib/recap/builder";

interface Props {
  recap: RecapSummary;
  onDone: () => void;
}

type Phase = 0 | 1 | 2 | 3;

export default function RecapIntro({ recap, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>(0);
  const [visibleItems, setVisibleItems] = useState(0);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const skip = useCallback(() => {
    clearTimer();
    setExiting(true);
    timerRef.current = setTimeout(onDone, 400);
  }, [onDone]);

  // Phase 0 → 1: boot screen
  useEffect(() => {
    if (phase !== 0) return;
    timerRef.current = setTimeout(() => setPhase(1), 1400);
    return clearTimer;
  }, [phase]);

  // Phase 1: reveal story cards one by one
  useEffect(() => {
    if (phase !== 1) return;

    const showNext = (idx: number) => {
      setVisibleItems(idx + 1);
      if (idx + 1 < recap.items.length) {
        timerRef.current = setTimeout(() => showNext(idx + 1), 520);
      } else {
        // All items shown; wait then advance
        timerRef.current = setTimeout(() => setPhase(2), 900);
      }
    };

    timerRef.current = setTimeout(() => showNext(0), 200);
    return clearTimer;
  }, [phase, recap.items.length]);

  // Phase 2 → 3
  useEffect(() => {
    if (phase !== 2) return;
    timerRef.current = setTimeout(() => setPhase(3), 2000);
    return clearTimer;
  }, [phase]);

  // Phase 3: exit
  useEffect(() => {
    if (phase !== 3) return;
    setExiting(true);
    timerRef.current = setTimeout(onDone, 500);
    return clearTimer;
  }, [phase, onDone]);

  // Global skip on any key
  useEffect(() => {
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [skip]);

  const trustColor = (s: number) =>
    s >= 85 ? "#00ff88" : s >= 60 ? "#00e5ff" : s >= 30 ? "#ff8c00" : "#ff2d2d";

  return (
    <div
      onClick={skip}
      className={`fixed inset-0 z-50 bg-vn-bg flex flex-col items-center justify-center transition-opacity duration-500 cursor-pointer select-none overflow-hidden ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,229,255,0.012) 2px,rgba(0,229,255,0.012) 4px)",
        }}
      />

      {/* HUD corner brackets */}
      <div className="absolute inset-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-vn-cyan/50" />
        <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-vn-cyan/50" />
        <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-vn-cyan/50" />
        <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-vn-cyan/50" />
      </div>

      {/* ── Phase 0: Boot ─────────────────────────────────── */}
      {phase === 0 && (
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          <div
            className="w-20 h-20 rounded-full border-2 border-vn-cyan flex items-center justify-center"
            style={{ boxShadow: "0 0 40px rgba(0,229,255,0.35)" }}
          >
            <span className="font-display text-2xl font-bold text-vn-cyan">V</span>
          </div>
          <div className="font-display text-3xl font-bold tracking-widest text-vn-cyan text-glow-cyan">
            VERITAS
          </div>
          <div className="data-readout text-vn-text-dim text-xs animate-pulse mt-1">
            INITIALISING 24-HOUR BRIEFING...
          </div>
        </div>
      )}

      {/* ── Phase 1: Story cards ───────────────────────────── */}
      {phase === 1 && (
        <div className="w-full max-w-sm px-4">
          <div className="data-readout text-vn-cyan text-xs text-center mb-4 tracking-widest">
            24-HOUR BRIEFING
          </div>
          <div className="space-y-2">
            {recap.items.slice(0, visibleItems).map((item, i) => (
              <div
                key={item.clusterId}
                className="bg-vn-panel border border-vn-border rounded-sm p-3 animate-slide-up"
              >
                <div className="flex items-center gap-2">
                  <span className="data-readout text-[10px] text-vn-orange">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="data-readout text-vn-text-dim text-[10px] ml-auto">
                    {item.articleCount} SRC
                  </span>
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: trustColor(item.trustScore) }}
                  >
                    {item.trustScore}
                  </span>
                </div>
                <p className="text-sm text-vn-text mt-1 leading-snug line-clamp-2">
                  {item.topHeadline}
                </p>
                <p className="data-readout text-[9px] text-vn-text-dim mt-1">
                  {item.sourceName.toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Phase 2: Summary stats ─────────────────────────── */}
      {phase === 2 && (
        <div className="flex flex-col items-center gap-8 animate-fade-in px-6 text-center">
          <div className="data-readout text-vn-cyan text-xs tracking-widest">
            INTELLIGENCE SUMMARY
          </div>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="font-mono text-4xl font-bold text-vn-orange">
                {recap.totalArticles}
              </div>
              <div className="data-readout text-[10px] text-vn-text-dim mt-2">
                ARTICLES
              </div>
            </div>
            <div>
              <div
                className="font-mono text-4xl font-bold"
                style={{ color: trustColor(recap.avgTrust) }}
              >
                {recap.avgTrust}
              </div>
              <div className="data-readout text-[10px] text-vn-text-dim mt-2">
                AVG TRUST
              </div>
            </div>
            <div>
              <div className="font-mono text-4xl font-bold text-vn-cyan">
                {recap.items.length}
              </div>
              <div className="data-readout text-[10px] text-vn-text-dim mt-2">
                CLUSTERS
              </div>
            </div>
          </div>
          <div className="border-t border-vn-border pt-4 w-full max-w-xs">
            <div className="data-readout text-[10px] text-vn-text-dim mb-1">
              TOP STORY
            </div>
            <p className="text-vn-text text-sm leading-snug">{recap.topTopic}</p>
          </div>
        </div>
      )}

      {/* Skip hint */}
      <div className="absolute bottom-8 data-readout text-vn-text-dim text-[10px] animate-pulse">
        TAP ANYWHERE TO SKIP
      </div>
    </div>
  );
}
