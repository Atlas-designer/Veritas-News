"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HudFrame from "@/components/ui/HudFrame";
import { Article, ArticleCluster } from "@/types";

interface TimelineEvent {
  date: string;
  headline: string;
  description: string;
}

interface Props {
  article: { id: string; title: string; summary: string; cluster?: ArticleCluster };
  topic: string;
  onClose: () => void;
}

const CLIENT_TTL = 60 * 60 * 1000;

// Find cluster articles that share keywords with a timeline event headline
function findRelatedArticles(articles: Article[], eventHeadline: string): Article[] {
  const words = eventHeadline
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !/^(that|this|with|from|have|been|were|will|when|than|into|they|them|also|more|some|about|would|which)$/.test(w));

  if (!words.length) return [];

  return articles.filter((a) => {
    const titleLower = a.title.toLowerCase();
    return words.some((w) => titleLower.includes(w));
  });
}

export default function TimelinePanel({ article, topic, onClose }: Props) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const cacheKey = `vn:timeline:${article.id}`;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const { events: e, generatedAt: g, ts } = JSON.parse(raw);
        if (Date.now() - ts < CLIENT_TTL) {
          setEvents(e);
          setGeneratedAt(g);
          setLoading(false);
          return;
        }
      }
    } catch {}

    fetch("/api/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: article.title,
        topic,
        summary: article.summary,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(true); return; }
        setEvents(data.events ?? []);
        setGeneratedAt(data.generatedAt);
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ events: data.events, generatedAt: data.generatedAt, ts: Date.now() })
          );
        } catch {}
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clusterArticles = article.cluster?.articles ?? [];

  const titleNode = (
    <span className="flex items-center gap-2">
      📅 BACKGROUND TIMELINE
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <HudFrame title={titleNode}>
          {/* Header row */}
          <div className="flex items-center justify-between mb-5">
            <span className="data-readout text-[9px] text-vn-text-dim tracking-widest">
              {loading
                ? "BUILDING TIMELINE..."
                : generatedAt
                ? `GENERATED · ${new Date(generatedAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </span>
            <button
              onClick={onClose}
              className="data-readout text-[10px] text-vn-text-dim hover:text-vn-red transition-colors"
            >
              × CLOSE
            </button>
          </div>

          {/* Article context chip */}
          <div className="mb-5 px-3 py-2 bg-vn-bg border border-vn-border/40 rounded-sm">
            <p className="data-readout text-[9px] text-vn-text-dim mb-1">ARTICLE</p>
            <p className="text-[11px] text-vn-text font-mono leading-snug line-clamp-2">
              {article.title}
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-10 text-center space-y-3">
              <p className="data-readout text-vn-cyan text-[10px] tracking-widest animate-pulse">
                BUILDING TIMELINE...
              </p>
              <p className="text-[10px] text-vn-text-dim font-mono">
                Researching historical context
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <p className="text-xs text-vn-red font-mono py-4">
              Failed to generate timeline. Ensure GROQ_API_KEY is set in your environment.
            </p>
          )}

          {/* Timeline */}
          {!loading && events && events.length > 0 && (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-vn-cyan/20" />

              <div className="space-y-0">
                {events.map((event, i) => {
                  const isExpanded = expandedIndex === i;
                  const related = findRelatedArticles(clusterArticles, event.headline);

                  return (
                    <div key={i} className="relative pl-6 pb-5">
                      {/* Dot */}
                      <div className="absolute left-[3px] top-[6px] w-2 h-2 rounded-full bg-vn-cyan border border-vn-bg" />

                      {/* Date */}
                      <span className="data-readout text-[9px] text-vn-cyan tracking-widest">
                        {event.date}
                      </span>

                      {/* Headline — clickable */}
                      <button
                        onClick={() => setExpandedIndex(isExpanded ? null : i)}
                        className="block w-full text-left mt-0.5"
                      >
                        <p className="text-sm font-mono text-vn-text font-semibold leading-snug hover:text-vn-cyan transition-colors">
                          {event.headline}
                          <span className="ml-2 text-[10px] text-vn-text-dim font-normal">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </p>
                      </button>

                      {/* Description */}
                      <p className="text-[11px] text-vn-text-dim font-mono leading-relaxed mt-1">
                        {event.description}
                      </p>

                      {/* Expanded: related articles */}
                      {isExpanded && (
                        <div className="mt-2 bg-vn-bg border border-vn-border/40 rounded-sm p-3">
                          {related.length > 0 ? (
                            <div className="space-y-2">
                              <p className="data-readout text-[9px] text-vn-text-dim mb-2">
                                RELATED ARTICLES
                              </p>
                              {related.map((a) => (
                                <Link
                                  key={a.id}
                                  href={`/article/${a.id}`}
                                  onClick={onClose}
                                  className="block group"
                                >
                                  <p className="text-[11px] font-mono text-vn-text group-hover:text-vn-cyan transition-colors leading-snug">
                                    {a.title}
                                  </p>
                                  <p className="data-readout text-[9px] text-vn-text-dim mt-0.5">
                                    {a.source.name.toUpperCase()}
                                  </p>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="data-readout text-[10px] text-vn-text-dim">
                              NO ARTICLES AVAILABLE
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[9px] text-vn-text-dim/40 font-mono mt-4 pt-3 border-t border-vn-border/30">
            AI-generated historical context · Cached hourly · Verify with primary sources
          </p>
        </HudFrame>
      </div>
    </div>
  );
}
