/**
 * /api/news — Multi-source RSS aggregator
 *
 * Replaces the NewsAPI integration. Fetches 10 RSS feeds in parallel,
 * normalises them to the shared Article type, deduplicates by URL,
 * and caches the result for 15 minutes server-side.
 *
 * No API key required — works in development and production.
 */

import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { getSourceRating } from "@/lib/sources/ratings";
import { Article, Source } from "@/types";

// Typed RSS item fields we care about
type FeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
};

const parser = new Parser<Record<string, unknown>, FeedItem>();

// ── Feed list ─────────────────────────────────────────────────────────────────
// 20 outlets spanning the full credibility / bias spectrum.
// fallbackDomain must match a key in sourceDatabase (ratings.ts).

const RSS_FEEDS: Array<{ url: string; domain: string }> = [
  // CENTER — highest trust
  { url: "https://feeds.apnews.com/rss/apf-topnews",                   domain: "apnews.com"                    },
  { url: "https://feeds.reuters.com/reuters/topNews",                   domain: "reuters.com"                   },
  { url: "https://feeds.bbci.co.uk/news/rss.xml",                      domain: "bbc.co.uk"                     },
  { url: "https://feeds.skynews.com/feeds/rss/home.xml",               domain: "news.sky.com"                  },
  { url: "https://rss.dw.com/xml/rss-en-all",                          domain: "dw.com"                        },
  { url: "https://www.france24.com/en/rss",                            domain: "france24.com"                  },
  // LEFT_CENTER
  { url: "https://feeds.npr.org/1001/rss.xml",                         domain: "npr.org"                       },
  { url: "https://www.theguardian.com/world/rss",                      domain: "theguardian.com"               },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",  domain: "nytimes.com"                   },
  { url: "http://rss.cnn.com/rss/cnn_topstories.rss",                  domain: "cnn.com"                       },
  { url: "https://feeds.washingtonpost.com/rss/world",                 domain: "washingtonpost.com"            },
  { url: "https://feeds.abcnews.com/abcnews/topstories",               domain: "abcnews.go.com"                },
  { url: "https://www.cbsnews.com/latest/rss/main",                    domain: "cbsnews.com"                   },
  // RIGHT_CENTER
  { url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",                domain: "wsj.com"                       },
  { url: "https://nypost.com/feed/",                                    domain: "nypost.com"                    },
  { url: "https://www.telegraph.co.uk/news/rss.xml",                   domain: "telegraph.co.uk"               },
  // RIGHT
  { url: "https://moxie.foxnews.com/google-publisher/latest.xml",      domain: "foxnews.com"                   },
  // International
  { url: "https://www.aljazeera.com/xml/rss/all.xml",                  domain: "aljazeera.com"                 },
  { url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", domain: "timesofindia.indiatimes.com"   },
  { url: "https://www.scmp.com/rss/2/feed",                            domain: "scmp.com"                      },
];

const MAX_PER_FEED = 15; // articles per feed before dedup
const SERVER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Server-side in-memory cache (resets on cold start — fine for this use case)
const serverCache = new Map<string, { data: Article[]; timestamp: number }>();

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const disabledParam = searchParams.get("disabled") ?? "";
  const disabledSet   = disabledParam
    ? new Set(disabledParam.split(",").map((d) => d.trim()).filter(Boolean))
    : new Set<string>();

  const activeFeeds = disabledSet.size > 0
    ? RSS_FEEDS.filter((f) => !disabledSet.has(f.domain))
    : RSS_FEEDS;

  // Cache key includes disabled set so different source selections are cached independently
  const sortedDisabled = Array.from(disabledSet).sort().join(",");
  const cacheKey = sortedDisabled ? `rss:${sortedDisabled}` : "rss:top";

  const cached = serverCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SERVER_CACHE_TTL) {
    return NextResponse.json(cached.data, { headers: { "X-Cache": "HIT" } });
  }

  // Fetch all feeds in parallel; individual failures are swallowed
  const results = await Promise.allSettled(
    activeFeeds.map(({ url, domain }) => fetchFeed(url, domain))
  );

  const articles: Article[] = [];
  let successCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
      successCount++;
    } else {
      console.warn("[/api/news] Feed failed:", result.reason?.message ?? result.reason);
    }
  }

  if (articles.length === 0) {
    console.error("[/api/news] All feeds failed");
    return NextResponse.json([], { status: 502 });
  }

  // Deduplicate by URL, sort newest-first
  const seen = new Set<string>();
  const deduped = articles
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .filter((a) => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

  serverCache.set(cacheKey, { data: deduped, timestamp: Date.now() });

  return NextResponse.json(deduped, {
    headers: { "X-Feed-Sources": successCount.toString() },
  });
}

// ── Feed fetcher ──────────────────────────────────────────────────────────────

async function fetchFeed(
  url: string,
  fallbackDomain: string
): Promise<Article[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Veritas-News/1.0 RSS Reader" },
      // Next.js extended fetch cache — revalidate every 15 min on the CDN layer too
      next: { revalidate: 900 },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);

    const xml = await res.text();
    const feed = await parser.parseString(xml);

    return feed.items
      .filter((item): item is FeedItem & { title: string; link: string } =>
        Boolean(item.title?.trim() && item.link?.trim())
      )
      .slice(0, MAX_PER_FEED)
      .map((item, i) => mapItem(item, fallbackDomain, i));
  } finally {
    clearTimeout(timeout);
  }
}

// ── Item normaliser ───────────────────────────────────────────────────────────

function mapItem(
  item: FeedItem & { title: string; link: string },
  fallbackDomain: string,
  index: number
): Article {
  // Try to resolve a known source from the article URL; fall back to the feed domain
  const urlDomain = extractDomain(item.link);
  const sourceRating =
    getSourceRating(urlDomain) ?? getSourceRating(fallbackDomain);

  const source: Source = sourceRating ?? {
    id: `rss-${fallbackDomain}-${index}`,
    name: fallbackDomain,
    domain: fallbackDomain,
    bias: "CENTER",
    factualRating: 50,
  };

  return {
    id: `rss-${fallbackDomain}-${Date.now()}-${index}`,
    title: item.title.trim(),
    url: item.link,
    source,
    publishedAt: item.pubDate
      ? new Date(item.pubDate).toISOString()
      : new Date().toISOString(),
    summary: stripHtml(item.contentSnippet ?? item.content ?? "").slice(0, 300),
    sentiment: 0,
    validityScore: 0,
    corroborationCount: 0,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
