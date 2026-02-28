"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HudFrame from "@/components/ui/HudFrame";
import { clearCache } from "@/lib/api/client";
import { getFlags, setFlag, FeatureFlags } from "@/lib/config/flags";
import { useAuth } from "@/contexts/AuthContext";

const topics = [
  "Politics", "Technology", "Climate", "Economy",
  "Health", "Science", "World", "Sports",
];

const biasOptions = [
  { value: "LEFT", label: "Left", color: "border-blue-500 text-blue-400" },
  { value: "LEFT_CENTER", label: "Left-Center", color: "border-sky-500 text-sky-400" },
  { value: "CENTER", label: "Center", color: "border-vn-cyan text-vn-cyan" },
  { value: "RIGHT_CENTER", label: "Right-Center", color: "border-amber-500 text-amber-400" },
  { value: "RIGHT", label: "Right", color: "border-red-500 text-red-400" },
];

const featureFlagMeta: { key: keyof FeatureFlags; label: string; description: string }[] = [
  { key: "FACT_CHECK_ENABLED", label: "FACT CHECK", description: "Query Google Fact Check API on article open (lazy, cached 24h)" },
  { key: "RECAP_ENABLED", label: "24H RECAP", description: "Show time-lapse intro animation on open" },
  { key: "MAP_ENABLED", label: "GLOBAL MAP", description: "Load Leaflet map on map page" },
  { key: "REDUCED_NETWORK_MODE", label: "CACHE ONLY", description: "Never make network calls — serve from local cache only" },
];

export default function SettingsPage() {
  const { syncPrefs } = useAuth();
  const [selectedTopics, setSelectedTopics] = useState<string[]>(topics);
  const [selectedBias, setSelectedBias] = useState<string[]>(biasOptions.map((b) => b.value));
  const [minTrust, setMinTrust] = useState(0);
  const [flags, setFlags] = useState<FeatureFlags>(getFlags());
  const [cacheCleared, setCacheCleared] = useState(false);

  // Read flags from localStorage on mount
  useEffect(() => {
    setFlags(getFlags());
  }, []);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleBias = (bias: string) => {
    setSelectedBias((prev) =>
      prev.includes(bias) ? prev.filter((b) => b !== bias) : [...prev, bias]
    );
  };

  const toggleFlag = (key: keyof FeatureFlags) => {
    const newValue = !flags[key];
    setFlag(key, newValue);
    const next = { ...flags, [key]: newValue };
    setFlags(next);
    syncPrefs({ featureFlags: next });
  };

  const handleClearCache = async () => {
    await clearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="font-display text-xl lg:text-2xl font-bold tracking-wider text-vn-cyan text-glow-cyan">
          CONFIGURATION
        </h1>
        <p className="text-vn-text-dim text-sm mt-1">
          Customize your news intelligence feed
        </p>
      </header>

      {/* Feature Flags */}
      <HudFrame title="FEATURE FLAGS" className="mb-4">
        <div className="space-y-3">
          {featureFlagMeta.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="data-readout text-[10px] text-vn-cyan">{label}</div>
                <div className="text-[11px] text-vn-text-dim">{description}</div>
              </div>
              <button
                onClick={() => toggleFlag(key)}
                className={`relative w-10 h-5 rounded-full border transition-all flex-shrink-0 ${
                  flags[key]
                    ? "border-vn-cyan bg-vn-cyan/20"
                    : "border-vn-border bg-vn-bg"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${
                    flags[key]
                      ? "left-[calc(100%-16px)] bg-vn-cyan"
                      : "left-0.5 bg-vn-text-dim"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </HudFrame>

      {/* Topic Filters */}
      <HudFrame title="TOPIC FILTERS" className="mb-4">
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => {
            const isActive = selectedTopics.includes(topic);
            return (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono tracking-wider border transition-all ${
                  isActive
                    ? "border-vn-cyan bg-vn-cyan/10 text-vn-cyan"
                    : "border-vn-border text-vn-text-dim hover:border-vn-text-dim"
                }`}
              >
                {topic.toUpperCase()}
              </button>
            );
          })}
        </div>
      </HudFrame>

      {/* Bias Filter */}
      <HudFrame title="BIAS RANGE" className="mb-4">
        <p className="text-xs text-vn-text-dim mb-3">
          Select which political perspectives to include in your feed
        </p>
        <div className="flex flex-wrap gap-2">
          {biasOptions.map((opt) => {
            const isActive = selectedBias.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleBias(opt.value)}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono tracking-wider border transition-all ${
                  isActive
                    ? `${opt.color} bg-current/10`
                    : "border-vn-border text-vn-text-dim hover:border-vn-text-dim"
                }`}
                style={isActive ? { backgroundColor: "rgba(255,255,255,0.05)" } : undefined}
              >
                {opt.label.toUpperCase()}
              </button>
            );
          })}
        </div>
      </HudFrame>

      {/* Minimum Trust */}
      <HudFrame title="MINIMUM TRUST SCORE" className="mb-4">
        <p className="text-xs text-vn-text-dim mb-3">
          Only show articles above this validity threshold
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={minTrust}
            onChange={(e) => setMinTrust(Number(e.target.value))}
            className="flex-1 accent-[#00e5ff]"
          />
          <span className="font-mono text-lg font-bold text-vn-cyan w-12 text-right">
            {minTrust}
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="data-readout text-[9px] text-vn-text-dim">ALL ARTICLES</span>
          <span className="data-readout text-[9px] text-vn-text-dim">VERIFIED ONLY</span>
        </div>
      </HudFrame>

      {/* Data Sources */}
      <HudFrame title="DATA SOURCES" className="mb-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs text-vn-text-dim">
              Manage which RSS feeds contribute to your news feed. Toggle individual sources on or off.
            </p>
            <Link
              href="/sources"
              className="data-readout text-[10px] px-3 py-1.5 rounded-sm border border-vn-cyan/50 text-vn-cyan hover:border-vn-cyan hover:bg-vn-cyan/10 transition-all flex-shrink-0"
            >
              SEE SOURCES →
            </Link>
          </div>
        </div>
      </HudFrame>

      {/* Cache management */}
      <HudFrame title="CACHE MANAGEMENT" className="mb-4">
        <p className="text-xs text-vn-text-dim mb-3">
          Articles are cached locally for 15 minutes. Fact-checks are cached for 24 hours.
        </p>
        <button
          onClick={handleClearCache}
          className={`data-readout text-[10px] px-4 py-2 rounded-sm border transition-all ${
            cacheCleared
              ? "border-vn-green text-vn-green bg-vn-green/10"
              : "border-vn-red/50 text-vn-red hover:border-vn-red hover:bg-vn-red/10"
          }`}
        >
          {cacheCleared ? "✓ CACHE CLEARED" : "CLEAR ALL CACHE"}
        </button>
      </HudFrame>
    </div>
  );
}
