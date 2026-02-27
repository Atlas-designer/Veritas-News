import { Article, Source } from "@/types";
import { getSourceRating } from "./ratings";

const NEWS_API_BASE = "https://newsapi.org/v2";

/**
 * Fetch top headlines from NewsAPI.
 * Requires a free API key from newsapi.org (100 requests/day on free tier).
 */
export async function fetchTopHeadlines(
  apiKey: string,
  options: {
    country?: string;
    category?: string;
    query?: string;
    pageSize?: number;
  } = {}
): Promise<Article[]> {
  const { country = "us", category, query, pageSize = 20 } = options;

  const params = new URLSearchParams({
    country,
    pageSize: pageSize.toString(),
    apiKey,
  });
  if (category) params.set("category", category);
  if (query) params.set("q", query);

  const response = await fetch(`${NEWS_API_BASE}/top-headlines?${params}`);
  if (!response.ok) throw new Error(`NewsAPI error: ${response.status}`);

  const data = await response.json();

  return (data.articles || []).map((raw: any, index: number) => {
    const domain = extractDomain(raw.url || "");
    const sourceRating = getSourceRating(domain);

    const source: Source = sourceRating ?? {
      id: `unknown-${index}`,
      name: raw.source?.name || "Unknown",
      domain,
      bias: "CENTER",
      factualRating: 50, // default for unknown sources
    };

    return {
      id: `news-${Date.now()}-${index}`,
      title: raw.title || "",
      url: raw.url || "",
      source,
      publishedAt: raw.publishedAt || new Date().toISOString(),
      summary: raw.description || "",
      sentiment: 0, // calculated by scoring engine later
      validityScore: 0, // calculated by scoring engine later
      corroborationCount: 0, // calculated by clustering later
    } satisfies Article;
  });
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
