"use client";

import { useEffect, useState } from "react";
import HudFrame from "@/components/ui/HudFrame";
import { ArticleCluster } from "@/types";

interface Props {
  clusters: ArticleCluster[];
  onClose: () => void;
}

const CLIENT_TTL = 60 * 60 * 1000; // 1 hour — matches server cache

export default function BriefingPanel({ clusters, onClose }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check client-side sessionStorage cache first
    try {
      const raw = sessionStorage.getItem("vn:briefing");
      if (raw) {
        const { text: t, generatedAt: g, ts } = JSON.parse(raw);
        if (Date.now() - ts < CLIENT_TTL) {
          setText(t);
          setGeneratedAt(g);
          setLoading(false);
          return;
        }
      }
    } catch {}

    const payload = clusters.slice(0, 10).map((c) => ({
      topic: c.topic,
      headline: c.articles[0]?.title ?? c.topic,
      sourceCount: c.sources.length,
      avgValidity: c.avgValidity,
    }));

    fetch("/api/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusters: payload }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(true); return; }
        setText(data.text);
        setGeneratedAt(data.generatedAt);
        try {
          sessionStorage.setItem(
            "vn:briefing",
            JSON.stringify({ text: data.text, generatedAt: data.generatedAt, ts: Date.now() })
          );
        } catch {}
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <HudFrame title="🤖 AI DAILY BRIEFING">
          {/* Meta row */}
          <div className="flex items-center justify-between mb-4">
            <span className="data-readout text-[9px] text-vn-text-dim tracking-widest">
              {generatedAt
                ? `GENERATED · ${new Date(generatedAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : loading
                ? "GENERATING..."
                : ""}
            </span>
            <button
              onClick={onClose}
              className="data-readout text-[10px] text-vn-text-dim hover:text-vn-red transition-colors"
            >
              × CLOSE
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-10 text-center space-y-3">
              <p className="data-readout text-vn-cyan text-[10px] tracking-widest animate-pulse">
                GENERATING BRIEFING...
              </p>
              <p className="text-[10px] text-vn-text-dim font-mono">
                Analysing today&apos;s top stories
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <p className="text-xs text-vn-red font-mono py-4">
              Failed to generate briefing. Ensure ANTHROPIC_API_KEY is set in .env.local.
            </p>
          )}

          {/* Briefing text */}
          {!loading && text && (
            <div className="space-y-4">
              {text
                .split("\n\n")
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i} className="text-[11px] text-vn-text font-mono leading-relaxed">
                    {para}
                  </p>
                ))}
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[9px] text-vn-text-dim/40 font-mono mt-5 pt-3 border-t border-vn-border/30">
            AI-generated summary · Based on today&apos;s top headlines via Veritas sources · Cached hourly
          </p>
        </HudFrame>
      </div>
    </div>
  );
}
