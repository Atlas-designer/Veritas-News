"use client";

import { useState } from "react";
import HudFrame from "./ui/HudFrame";
import { ScoringResult } from "@/types";

const DIMENSION_INFO: Record<string, { icon: string; explanation: string }> = {
  Corroboration: {
    icon: "⊕",
    explanation:
      "How many independent outlets are reporting the same story. Single-source stories score low regardless of outlet quality.",
  },
  "Source Reliability": {
    icon: "◈",
    explanation:
      "The historical factual accuracy of this outlet, based on public media reliability assessments.",
  },
  "Fact Check": {
    icon: "✓",
    explanation:
      "Results from independent fact-checkers (PolitiFact, Snopes, etc.). No data returns a neutral 50.",
  },
  Consistency: {
    icon: "≡",
    explanation:
      "Agreement in tone across corroborating sources. High variance suggests a contested or evolving story.",
  },
};

function getVerdict(score: number): { text: string; color: string } {
  if (score >= 85) return { text: "High confidence — widely corroborated", color: "text-vn-green" };
  if (score >= 70) return { text: "Likely accurate — well sourced", color: "text-vn-cyan" };
  if (score >= 50) return { text: "Mixed signals — verify independently", color: "text-vn-cyan" };
  if (score >= 30) return { text: "Low confidence — limited corroboration", color: "text-vn-orange" };
  return { text: "Very low confidence — treat with scepticism", color: "text-vn-red" };
}

function getBarColor(score: number): string {
  if (score >= 80) return "#00ff88";
  if (score >= 60) return "#00e5ff";
  if (score >= 40) return "#ff8c00";
  return "#ff2d2d";
}

interface WhyThisScoreProps {
  result: ScoringResult;
  compact?: boolean;
}

export default function WhyThisScore({ result, compact = false }: WhyThisScoreProps) {
  const [expanded, setExpanded] = useState(!compact);
  const verdict = getVerdict(result.overall);

  return (
    <HudFrame title="WHY THIS SCORE?">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-3xl font-bold"
            style={{ color: getBarColor(result.overall) }}
          >
            {result.overall}
          </span>
          <div>
            <div className="data-readout text-[9px] text-vn-text-dim">
              OVERALL VALIDITY
            </div>
            <div className={`text-[11px] mt-0.5 ${verdict.color}`}>
              {verdict.text}
            </div>
          </div>
        </div>

        {compact && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="data-readout text-[10px] text-vn-cyan border border-vn-cyan/30 px-2 py-1 rounded-sm hover:bg-vn-cyan/10 transition-all flex-shrink-0"
          >
            {expanded ? "LESS ↑" : "DETAILS ↓"}
          </button>
        )}
      </div>

      {/* Breakdown */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-vn-border pt-4">
          {result.breakdown.map((item) => {
            const info = DIMENSION_INFO[item.label];
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-vn-cyan text-sm">{info?.icon ?? "◉"}</span>
                    <span className="data-readout text-[10px] text-vn-text">
                      {item.label.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="data-readout text-[9px] text-vn-text-dim">
                      weight ×{item.weight}
                    </span>
                    <span
                      className="font-mono text-sm font-bold"
                      style={{ color: getBarColor(item.score) }}
                    >
                      {item.score}
                    </span>
                  </div>
                </div>

                {/* Score bar */}
                <div className="h-1.5 bg-vn-border rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${item.score}%`,
                      backgroundColor: getBarColor(item.score),
                    }}
                  />
                </div>

                {/* Explanation */}
                {info?.explanation && (
                  <p className="text-[10px] text-vn-text-dim leading-relaxed">
                    {info.explanation}
                  </p>
                )}
              </div>
            );
          })}

          {/* Weighted contribution summary */}
          <div className="border-t border-vn-border pt-3 mt-3">
            <div className="data-readout text-[9px] text-vn-text-dim mb-2">
              WEIGHTED CONTRIBUTIONS
            </div>
            <div className="flex gap-1 h-2">
              {result.breakdown.map((item) => (
                <div
                  key={item.label}
                  className="rounded-sm"
                  title={`${item.label}: ${Math.round(item.score * item.weight)}`}
                  style={{
                    flex: item.weight,
                    backgroundColor: getBarColor(item.score),
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="data-readout text-[8px] text-vn-text-dim">
                CORROBORATION (40%)
              </span>
              <span className="data-readout text-[8px] text-vn-text-dim">
                RELIABILITY (30%)
              </span>
              <span className="data-readout text-[8px] text-vn-text-dim">
                FACT (20%)
              </span>
              <span className="data-readout text-[8px] text-vn-text-dim">
                CONS. (10%)
              </span>
            </div>
          </div>
        </div>
      )}
    </HudFrame>
  );
}
