"use client";

import { useEffect, useState, useCallback } from "react";
import { Article, ArticleCluster } from "@/types";
import { fetchArticles } from "@/lib/api/client";
import { buildClusters } from "@/lib/clustering/scorer";
import { mockArticles } from "@/lib/mock/data";
import { getFlags } from "@/lib/config/flags";
import { buildRecap, RecapSummary } from "@/lib/recap/builder";
import {
  ALL_CATEGORIES,
  CATEGORY_META,
  Category,
} from "@/lib/categories";
import { SPORTS, Sport } from "@/lib/sports/scores";
import { getCustomTrustScores } from "@/lib/sources/prefs";
import { getUsername } from "@/lib/auth/username";
import ClusterCard from "./ClusterCard";
import RecapIntro from "./RecapIntro";
import ScoresPanel from "./ScoresPanel";
import { FeedSkeleton } from "./ui/Skeleton";

type SortMode = "top" | "latest";

// ── Rolling news ticker ───────────────────────────────────────────────────────

function NewsTicker({ clusters }: { clusters: ArticleCluster[] }) {
  // Take up to 15 clusters sorted newest first; mark breaking ones
  const items = [...clusters]
    .sort((a, b) => (b.lastUpdated ?? "").localeCompare(a.lastUpdated ?? ""))
    .slice(0, 15)
    .flatMap((c) => {
      const title = c.articles[0]?.title;
      if (!title) return [];
      const isBreaking =
        (c.freshness ?? 0) > 90 && (c.sourceDiversity ?? 0) >= 40;
      return [isBreaking ? `● ${title}` : title];
    });

  if (items.length === 0) return null;

  // Separator between headlines
  const SEP = "   ·   ";
  const text = items.join(SEP);

  // Duration: ~100px/s. Monospace xs ≈ 7.5px/char. Duration = textWidth / 100
  const duration = Math.max(15, Math.round(text.length * 7.5 / 100));

  return (
    <div className="overflow-hidden border border-vn-border bg-vn-panel rounded-sm mb-6 flex items-stretch h-9">
      {/* Label */}
      <div className="flex-shrink-0 px-3 border-r border-vn-border bg-vn-red/10 flex items-center">
        <span className="data-readout text-[9px] text-vn-red tracking-widest">LIVE</span>
      </div>

      {/* Scrolling text */}
      <div className="overflow-hidden flex-1 flex items-center">
        <div
          className="inline-flex whitespace-nowrap font-mono text-[11px] text-vn-text"
          style={{ animation: `marquee ${duration}s linear infinite` }}
        >
          <span className="px-4">{text}</span>
          <span className="px-4" aria-hidden="true">{text}</span>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function NewsFeed() {
  const [clusters, setClusters] = useState<ArticleCluster[]>([]);
  const [username] = useState(() => getUsername());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("top");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [recap, setRecap] = useState<RecapSummary | null>(null);
  const [showRecap, setShowRecap] = useState(() => {
    if (typeof window === "undefined") return false;
    const flags = getFlags();
    return flags.RECAP_ENABLED && !sessionStorage.getItem("vn:recap-shown");
  });
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [activeSport, setActiveSport] = useState<Sport | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchArticles({ force });

      let articles: Article[];
      if (result.usingDemo || result.articles.length === 0) {
        articles = mockArticles;
        setUsingDemo(true);
      } else {
        articles = result.articles;
        setUsingDemo(false);
      }

      setFromCache(result.fromCache);
      const built = buildClusters(articles);
      setClusters(built);
      setLastUpdated(new Date());

      // Build recap data once loaded (overlay already shown if RECAP_ENABLED)
      const flags = getFlags();
      if (
        flags.RECAP_ENABLED &&
        typeof sessionStorage !== "undefined" &&
        !sessionStorage.getItem("vn:recap-shown")
      ) {
        setRecap(buildRecap(built));
      }
    } catch (err) {
      console.error("[NewsFeed] load failed:", err);
      setError("FEED UNAVAILABLE — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCategoryClick = useCallback((cat: Category) => {
    setActiveCategory((prev) => {
      if (prev === cat) {
        // Deselect — also clear sport if leaving Sports
        setActiveSport(null);
        return null;
      }
      // Switching away from Sports → clear sport picker
      if (cat !== "Sports") setActiveSport(null);
      return cat;
    });
  }, []);

  const handleSportClick = useCallback((sport: Sport) => {
    setActiveSport((prev) => (prev?.id === sport.id ? null : sport));
  }, []);

  const sorted =
    sortMode === "latest"
      ? [...clusters].sort((a, b) =>
          (b.lastUpdated ?? "").localeCompare(a.lastUpdated ?? "")
        )
      : clusters;

  const q = query.trim().toLowerCase();
  const customTrust = getCustomTrustScores();
  const filtered = sorted
    .filter((c) => {
      if (!activeCategory) return true;
      const kws = CATEGORY_META[activeCategory].keywords;
      // Strong signal: cluster topic contains a category keyword
      if (kws.some((kw) => c.topic.toLowerCase().includes(kw))) return true;
      // Weaker signal: require 2+ article title matches to avoid false positives
      let hits = 0;
      for (const art of c.articles.slice(0, 6)) {
        if (kws.some((kw) => art.title.toLowerCase().includes(kw))) {
          if (++hits >= 2) return true;
        }
      }
      return false;
    })
    .filter(
      (c) =>
        !q ||
        c.topic.toLowerCase().includes(q) ||
        c.articles.some(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.summary?.toLowerCase().includes(q)
        ) ||
        c.sources.some((s) => s.name.toLowerCase().includes(q))
    )
    .filter((c) => {
      // Gate clusters where every source has effective trust < 20 —
      // they need corroboration from at least one trusted source to appear.
      const allLowTrust = c.sources.every((s) => {
        const effective = customTrust[s.domain] ?? s.factualRating;
        return effective < 20;
      });
      return !allLowTrust;
    });

  const handleRecapDone = useCallback(() => {
    setShowRecap(false);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("vn:recap-shown", "1");
    }
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Recap intro — full-screen overlay, shown immediately, waits for data */}
      {showRecap && (
        <RecapIntro recap={recap} onDone={handleRecapDone} />
      )}

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="status-dot live" />
          <span className="data-readout text-vn-green">Live Feed</span>
          {fromCache && (
            <span className="data-readout text-[9px] text-vn-text-dim">
              CACHED
            </span>
          )}
          <span className="data-readout text-vn-text-dim ml-auto">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })}
          </span>
        </div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-wider text-glow-cyan text-vn-cyan">
          VERITAS
        </h1>
        {username && (
          <p className="text-vn-text text-sm mt-1">
            {getGreeting()},{" "}
            <span className="text-vn-cyan font-medium capitalize">{username}</span>
          </p>
        )}
      </header>

      {/* Demo mode banner */}
      {usingDemo && !loading && (
        <div className="mb-4 px-3 py-2 border border-vn-orange/30 bg-vn-orange/10 rounded-sm flex items-center gap-2">
          <span className="text-vn-orange text-lg">⚠</span>
          <div>
            <p className="text-xs text-vn-orange font-mono">DEMO MODE</p>
            <p className="text-[11px] text-vn-text-dim">
              Add a NewsAPI key in Config to see live articles.
            </p>
          </div>
        </div>
      )}

      {/* Rolling news ticker */}
      {!loading && clusters.length > 0 && (
        <NewsTicker clusters={clusters} />
      )}

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vn-text-dim text-xs pointer-events-none">
          ⌕
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH STORIES, SOURCES..."
          className="w-full bg-vn-panel border border-vn-border rounded-sm pl-8 pr-8 py-2 font-mono text-xs text-vn-text placeholder-vn-text-dim/60 focus:outline-none focus:border-vn-cyan/60 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-vn-text-dim hover:text-vn-text text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category pills — single-select */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-1 scrollbar-hide">
        {ALL_CATEGORIES.map((cat) => {
          const { icon, short } = CATEGORY_META[cat];
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-mono tracking-wider transition-all ${
                active
                  ? "border-vn-cyan bg-vn-cyan/15 text-vn-cyan"
                  : "border-vn-border text-vn-text-dim hover:border-vn-cyan/40 hover:text-vn-text"
              }`}
            >
              <span>{icon}</span>
              <span>{short}</span>
            </button>
          );
        })}
        {activeCategory && (
          <button
            onClick={() => { setActiveCategory(null); setActiveSport(null); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-sm border border-vn-border text-[10px] font-mono text-vn-text-dim hover:text-vn-red hover:border-vn-red/40 transition-all"
          >
            ✕ ALL
          </button>
        )}
      </div>

      {/* Sports sub-picker — visible when Sports category is active */}
      {activeCategory === "Sports" && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 pl-1 border-l-2 border-vn-orange/50 ml-1 scrollbar-hide">
          {SPORTS.map((sport) => {
            const isActive = activeSport?.id === sport.id;
            return (
              <button
                key={sport.id}
                onClick={() => handleSportClick(sport)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-mono tracking-wider transition-all ${
                  isActive
                    ? "border-vn-orange bg-vn-orange/15 text-vn-orange"
                    : "border-vn-border text-vn-text-dim hover:border-vn-orange/40 hover:text-vn-text"
                }`}
              >
                <span>{sport.icon}</span>
                <span>{sport.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Scores panel — shown when a sport is selected */}
      {activeSport && (
        <div className="mb-4">
          <ScoresPanel sport={activeSport} />
        </div>
      )}

      {/* Sort / Feed / Last updated — hidden when a sport is selected */}
      {!activeSport && (
        <>
          {/* Sort + Refresh controls */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-vn-cyan/50 to-transparent" />
            <div className="flex gap-1">
              {(["top", "latest"] as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`data-readout text-[10px] px-3 py-1.5 rounded-sm border transition-all ${
                    sortMode === mode
                      ? "border-vn-cyan bg-vn-cyan/10 text-vn-cyan"
                      : "border-vn-border text-vn-text-dim hover:border-vn-cyan/40"
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="data-readout text-[10px] px-3 py-1.5 rounded-sm border border-vn-border text-vn-text-dim hover:border-vn-cyan/40 transition-all disabled:opacity-40"
            >
              ↻ REFRESH
            </button>
            <div className="h-px flex-1 bg-gradient-to-l from-vn-cyan/50 to-transparent" />
          </div>

          {/* Feed */}
          {loading ? (
            <FeedSkeleton />
          ) : error ? (
            <div className="text-center py-16 space-y-4">
              <p className="data-readout text-vn-red text-xs">{error}</p>
              <button
                onClick={() => load(true)}
                className="data-readout text-[10px] px-4 py-2 rounded-sm border border-vn-cyan/50 text-vn-cyan hover:border-vn-cyan hover:bg-vn-cyan/10 transition-all"
              >
                ↻ RETRY
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="data-readout text-vn-text-dim">
                {q
                  ? `NO RESULTS FOR "${q.toUpperCase()}"`
                  : activeCategory
                    ? `NO ${CATEGORY_META[activeCategory].short} STORIES RIGHT NOW`
                    : "NO STORIES FOUND"}
              </p>
              {(q || activeCategory) && (
                <button
                  onClick={() => { setQuery(""); setActiveCategory(null); setActiveSport(null); }}
                  className="data-readout text-[10px] text-vn-cyan hover:text-glow-cyan transition-all"
                >
                  SHOW ALL STORIES
                </button>
              )}
              {!q && !activeCategory && (
                <button
                  onClick={() => load(true)}
                  className="data-readout text-[10px] px-4 py-2 rounded-sm border border-vn-border text-vn-text-dim hover:border-vn-cyan/40 transition-all"
                >
                  ↻ RETRY
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((cluster) => (
                <ClusterCard key={cluster.id} cluster={cluster} />
              ))}
            </div>
          )}

          {/* Last updated */}
          {lastUpdated && !loading && (
            <p className="text-center data-readout text-[9px] text-vn-text-dim mt-6">
              LAST UPDATED {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}
