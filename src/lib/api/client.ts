import { dbCache } from "./cache";
import { CACHE_TTL, RATE_LIMITS, getFlags } from "../config/flags";
import { getDisabledSources } from "../sources/prefs";
import { Article } from "@/types";

// In-memory rate limit tracker (reset on page refresh, that's fine)
const lastFetch: Record<string, number> = {};

function isRateLimited(key: string, minIntervalMs: number): boolean {
  const last = lastFetch[key] || 0;
  return Date.now() - last < minIntervalMs;
}

function markFetched(key: string): void {
  lastFetch[key] = Date.now();
}

export type FetchResult = {
  articles: Article[];
  fromCache: boolean;
  usingDemo: boolean;
};

/**
 * Fetch articles — the single entry point for all news data.
 * Order: rate-limit check → IndexedDB cache → API route → stale cache fallback.
 */
export async function fetchArticles(options: {
  category?: string;
  query?: string;
  force?: boolean;
} = {}): Promise<FetchResult> {
  const flags = getFlags();

  // Reduced network mode: cache only
  if (flags.REDUCED_NETWORK_MODE && !options.force) {
    const cached = await dbCache.get<Article[]>(cacheKey(options));
    if (cached) return { articles: cached, fromCache: true, usingDemo: false };
  }

  const key = cacheKey(options);

  // Rate limit check (skip on force refresh)
  if (!options.force && isRateLimited("news", RATE_LIMITS.NEWS_MIN_INTERVAL_MS)) {
    const cached = await dbCache.get<Article[]>(key);
    if (cached) return { articles: cached, fromCache: true, usingDemo: false };
  }

  // Check IndexedDB cache
  if (!options.force) {
    const cached = await dbCache.get<Article[]>(key);
    if (cached) return { articles: cached, fromCache: true, usingDemo: false };
  }

  // Fetch from API route with exponential backoff
  try {
    const articles = await fetchWithBackoff(options);

    if (articles.length === 0) {
      // API returned nothing — likely no key configured, use demo data
      const stale = await dbCache.get<Article[]>(key);
      if (stale) return { articles: stale, fromCache: true, usingDemo: false };
      return { articles: [], fromCache: false, usingDemo: true };
    }

    await dbCache.set(key, articles, CACHE_TTL.NEWS);
    markFetched("news");

    return { articles, fromCache: false, usingDemo: false };
  } catch (error) {
    console.error("[apiClient] Fetch failed:", error);

    // Stale cache fallback
    const stale = await dbCache.get<Article[]>(key);
    if (stale) return { articles: stale, fromCache: true, usingDemo: false };

    return { articles: [], fromCache: false, usingDemo: true };
  }
}

async function fetchWithBackoff(
  options: { category?: string; query?: string },
  attempt = 0
): Promise<Article[]> {
  const params = new URLSearchParams();
  if (options.category) params.set("category", options.category);
  if (options.query) params.set("q", options.query);

  const disabled = getDisabledSources();
  if (disabled.size > 0) params.set("disabled", Array.from(disabled).join(","));

  const response = await fetch(`/api/news?${params}`);

  if (response.status === 429 && attempt < 3) {
    // Rate limited — exponential backoff
    await sleep(Math.pow(2, attempt) * 1000);
    return fetchWithBackoff(options, attempt + 1);
  }

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  return response.json();
}

export async function clearCache(): Promise<void> {
  await dbCache.clear();
  Object.keys(lastFetch).forEach((k) => delete lastFetch[k]);
}

function cacheKey(options: { category?: string; query?: string }): string {
  const disabled = Array.from(getDisabledSources()).sort().join(",");
  return `articles:${options.category || "top"}:${options.query || ""}:${disabled}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
