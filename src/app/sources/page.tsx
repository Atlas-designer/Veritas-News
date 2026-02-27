"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SOURCES, BIAS_LABELS, BIAS_COLORS, type SourceDef } from "@/lib/sources/list";
import {
  getDisabledSources,
  toggleSource,
  enableAll,
  disableAll,
} from "@/lib/sources/prefs";

export default function SourcesPage() {
  const [disabled, setDisabled] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDisabled(getDisabledSources());
  }, []);

  const handleToggle = (domain: string) => {
    setDisabled(toggleSource(domain));
  };

  const handleEnableAll = () => {
    enableAll();
    setDisabled(new Set());
  };

  const handleDisableAll = () => {
    const allDomains = SOURCES.map((s) => s.domain);
    disableAll(allDomains);
    setDisabled(new Set(allDomains));
  };

  const activeCount = SOURCES.length - disabled.size;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">

      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl lg:text-2xl font-bold tracking-wider text-vn-cyan">
            NEWS SOURCES
          </h1>
          <p className="text-vn-text-dim text-sm mt-1">
            {activeCount} of {SOURCES.length} sources active
          </p>
        </div>
        <Link
          href="/settings"
          className="data-readout text-[10px] text-vn-text-dim hover:text-vn-cyan border border-vn-border hover:border-vn-cyan/40 px-3 py-1.5 rounded-sm transition-all flex-shrink-0"
        >
          ← SETTINGS
        </Link>
      </header>

      {/* Bulk controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleEnableAll}
          className="data-readout text-[10px] px-3 py-1.5 rounded-sm border border-vn-green/50 text-vn-green hover:border-vn-green hover:bg-vn-green/10 transition-all"
        >
          ENABLE ALL
        </button>
        <button
          onClick={handleDisableAll}
          className="data-readout text-[10px] px-3 py-1.5 rounded-sm border border-vn-red/50 text-vn-red hover:border-vn-red hover:bg-vn-red/10 transition-all"
        >
          DISABLE ALL
        </button>
      </div>

      {/* Source list */}
      <div className="border border-vn-border rounded-sm bg-vn-panel overflow-hidden">
        <div className="px-4 py-2 border-b border-vn-border">
          <span className="data-readout text-[10px] text-vn-text-dim">RSS FEEDS</span>
        </div>

        {SOURCES.map((source, i) => (
          <SourceRow
            key={source.domain}
            source={source}
            enabled={!disabled.has(source.domain)}
            onToggle={() => handleToggle(source.domain)}
            last={i === SOURCES.length - 1}
          />
        ))}
      </div>

      <p className="text-[10px] text-vn-text-dim mt-4 font-mono">
        Changes take effect on the next feed refresh. Preferences are saved locally in your browser.
      </p>
    </div>
  );
}

// ── Source row ─────────────────────────────────────────────────────────────

function SourceRow({
  source,
  enabled,
  onToggle,
  last,
}: {
  source: SourceDef;
  enabled: boolean;
  onToggle: () => void;
  last: boolean;
}) {
  const biasColor = BIAS_COLORS[source.bias];

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors ${
        !last ? "border-b border-vn-border/40" : ""
      } ${!enabled ? "opacity-50" : ""}`}
    >
      {/* Flag + name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-base leading-none flex-shrink-0">{source.flag}</span>
        <div className="min-w-0">
          <p className="font-mono text-[13px] text-vn-text leading-tight truncate">
            {source.name}
          </p>
          <p className="data-readout text-[9px] text-vn-text-dim/60 leading-none">
            {source.domain}
          </p>
        </div>
      </div>

      {/* Bias badge */}
      <span
        className={`data-readout text-[9px] px-2 py-0.5 rounded-sm border flex-shrink-0 ${biasColor} bg-current/5`}
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        {BIAS_LABELS[source.bias].toUpperCase()}
      </span>

      {/* Trust score */}
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <span
          className={`font-mono text-sm font-bold leading-none ${
            source.factualRating >= 85
              ? "text-vn-green"
              : source.factualRating >= 70
                ? "text-vn-cyan"
                : source.factualRating >= 55
                  ? "text-vn-orange"
                  : "text-vn-red"
          }`}
        >
          {source.factualRating}
        </span>
        <span className="data-readout text-[8px] text-vn-text-dim/50 leading-none">TRUST</span>
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        aria-label={enabled ? `Disable ${source.name}` : `Enable ${source.name}`}
        className={`relative w-10 h-5 rounded-full border transition-all flex-shrink-0 ${
          enabled
            ? "border-vn-cyan bg-vn-cyan/20"
            : "border-vn-border bg-vn-bg"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${
            enabled
              ? "left-[calc(100%-18px)] bg-vn-cyan"
              : "left-0.5 bg-vn-text-dim"
          }`}
        />
      </button>
    </div>
  );
}
