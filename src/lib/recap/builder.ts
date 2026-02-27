/**
 * EPIC 6.1 — 24-hour recap builder
 *
 * Pulls from already-fetched cluster data — zero extra API calls.
 * Filters clusters active in the last 24h, returns top 6 by score.
 */

import { ArticleCluster } from "@/types";

export interface RecapItem {
  clusterId: string;
  topic: string;
  articleCount: number;
  trustScore: number;
  topHeadline: string;
  sourceName: string;
}

export interface RecapSummary {
  items: RecapItem[];
  totalArticles: number;
  avgTrust: number;
  topTopic: string;
  generatedAt: string;
}

const RECAP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export function buildRecap(clusters: ArticleCluster[]): RecapSummary {
  const cutoff = Date.now() - RECAP_WINDOW_MS;

  // Include clusters active in last 24h; include those without timestamps (demo mode)
  const recent = clusters.filter((c) => {
    const ts = c.lastUpdated ?? c.firstSeen ?? "";
    return !ts || new Date(ts).getTime() > cutoff;
  });

  const sorted = [...recent]
    .sort((a, b) => (b.score ?? b.avgValidity) - (a.score ?? a.avgValidity))
    .slice(0, 6);

  const items: RecapItem[] = sorted.map((c) => {
    const top = c.articles[0];
    return {
      clusterId: c.id,
      topic: c.topic,
      articleCount: c.articleCount,
      trustScore: Math.round(c.trustAggregate ?? c.avgValidity),
      topHeadline: top?.title ?? c.topic,
      sourceName: top?.source.name ?? "Multiple Sources",
    };
  });

  const totalArticles = clusters.reduce((s, c) => s + c.articleCount, 0);
  const avgTrust =
    clusters.length > 0
      ? Math.round(
          clusters.reduce(
            (s, c) => s + (c.trustAggregate ?? c.avgValidity),
            0
          ) / clusters.length
        )
      : 0;

  return {
    items,
    totalArticles,
    avgTrust,
    topTopic: items[0]?.topic ?? "No stories loaded",
    generatedAt: new Date().toISOString(),
  };
}
