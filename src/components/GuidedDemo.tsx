"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  onDone: () => void;
}

const STEPS = [
  {
    icon: "✦",
    title: "TRUST SCORES",
    body: "Every story is scored 0–100 based on corroboration, source reliability, and independent fact-checks. The higher the score, the more confidence you can place in it.",
  },
  {
    icon: "⚡",
    title: "CATEGORIES",
    body: "Filter your feed by Politics, Military, Economy, Science & Tech, Sports, and Environment. Tap a category pill at the top of the feed to focus on what matters to you.",
  },
  {
    icon: "◈",
    title: "SPORTS SCORES",
    body: "Select the Sports category to unlock live scores alongside sports news — all in one place. Tap any sport to see current match results.",
  },
  {
    icon: "⊕",
    title: "GLOBAL MAP",
    body: "The Map tab plots stories geographically so you can see where news is breaking in real time. Tap any marker for a summary of the story.",
  },
  {
    icon: "◉",
    title: "SOURCES",
    body: "Go to the Sources tab to control which outlets feed your news. Toggle any source on or off, and personalise individual trust scores to match your own judgement.",
  },
  {
    icon: "⚙",
    title: "SETTINGS",
    body: "Configure feature flags, bias filters, minimum trust thresholds, and cache management. You can also replay this tour at any time from the Settings page.",
  },
];

export default function GuidedDemo({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  const finish = useCallback(() => {
    setExiting(true);
    setTimeout(onDone, 400);
  }, [onDone]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  // Skip on any key press
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [finish]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={`fixed inset-0 z-[90] bg-vn-bg flex flex-col items-center justify-center px-6 transition-opacity duration-400 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(232,119,58,0.012) 2px,rgba(232,119,58,0.012) 4px)",
        }}
      />

      {/* HUD corner brackets */}
      <div className="absolute inset-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-vn-cyan/50" />
        <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-vn-cyan/50" />
        <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-vn-cyan/50" />
        <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-vn-cyan/50" />
      </div>

      {/* Step counter */}
      <div className="absolute top-8 right-8">
        <span className="data-readout text-[10px] text-vn-text-dim">
          {step + 1} / {STEPS.length}
        </span>
      </div>

      {/* Content */}
      <div className="w-full max-w-sm text-center animate-fade-in" key={step}>
        {/* Icon orb */}
        <div
          className="w-20 h-20 rounded-full border-2 border-vn-cyan flex items-center justify-center mx-auto mb-6"
          style={{ boxShadow: "0 0 40px rgba(232,119,58,0.2)" }}
        >
          <span className="text-3xl">{current.icon}</span>
        </div>

        <div className="data-readout text-vn-cyan tracking-widest mb-3">
          {current.title}
        </div>

        <p className="text-vn-text text-sm leading-relaxed max-w-xs mx-auto">
          {current.body}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mt-10 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step
                ? "w-4 h-2 bg-vn-cyan"
                : i < step
                  ? "w-2 h-2 bg-vn-cyan/40"
                  : "w-2 h-2 bg-vn-border"
            }`}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={finish}
          className="flex-1 data-readout text-[10px] py-3 rounded-sm border border-vn-border text-vn-text-dim hover:border-vn-text-dim transition-all"
        >
          SKIP
        </button>
        <button
          onClick={next}
          className="flex-[2] data-readout text-[11px] py-3 rounded-sm border border-vn-cyan bg-vn-cyan/10 text-vn-cyan hover:bg-vn-cyan/20 transition-all tracking-widest"
        >
          {isLast ? "GET STARTED →" : "NEXT →"}
        </button>
      </div>

      <p className="data-readout text-[9px] text-vn-text-dim/40 mt-4">
        PRESS ESC TO SKIP
      </p>
    </div>
  );
}
