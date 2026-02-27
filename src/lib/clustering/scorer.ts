import { Article, ArticleCluster } from "@/types";
import { clusterByTFIDF, extractTopKeywords } from "./tfidf";
import { calculateValidity } from "@/lib/scoring/engine";

/**
 * Score a cluster on four axes, then combine.
 * Weights: freshness 25%, velocity 25%, source diversity 30%, trust 20%
 */
function scoreCluster(articles: Article[]): {
  freshness: number;
  velocity: number;
  sourceDiversity: number;
  trustAggregate: number;
  score: number;
} {
  if (articles.length === 0) {
    return { freshness: 0, velocity: 0, sourceDiversity: 0, trustAggregate: 0, score: 0 };
  }

  const dates = articles.map((a) => new Date(a.publishedAt).getTime());
  const newestMs = Math.max(...dates);
  const oldestMs = Math.min(...dates);

  // Freshness: penalise by age of the most recent article (-4pts/hr)
  const ageHours = (Date.now() - newestMs) / 3_600_000;
  const freshness = Math.max(0, Math.round(100 - ageHours * 4));

  // Velocity: articles per hour (10+ = 100)
  const spanHours = Math.max(1, (Date.now() - oldestMs) / 3_600_000);
  const velocity = Math.min(100, Math.round((articles.length / spanHours) * 10));

  // Source diversity: unique domains (5+ = 100)
  const uniqueDomains = new Set(articles.map((a) => a.source.domain)).size;
  const sourceDiversity = Math.min(100, uniqueDomains * 20);

  // Trust aggregate: avg validity of scored articles (0 scores excluded)
  const scored = articles.filter((a) => a.validityScore > 0);
  const trustAggregate =
    scored.length > 0
      ? Math.round(
          scored.reduce((s, a) => s + a.validityScore, 0) / scored.length
        )
      : 50;

  const score = Math.round(
    freshness * 0.25 +
      velocity * 0.25 +
      sourceDiversity * 0.3 +
      trustAggregate * 0.2
  );

  return { freshness, velocity, sourceDiversity, trustAggregate, score };
}

/**
 * Run validity scoring on every article using its cluster siblings as corroboration.
 */
function scoreArticlesInCluster(articles: Article[]): Article[] {
  return articles.map((article) => {
    const siblings = articles.filter((a) => a.id !== article.id);
    const result = calculateValidity(article, siblings, []);
    return {
      ...article,
      validityScore: result.overall,
      corroborationCount: siblings.length + 1,
      scoringBreakdown: result,
    };
  });
}

/**
 * Build ArticleCluster objects from raw articles.
 * Runs TF-IDF clustering → validity scoring → cluster scoring.
 */
export function buildClusters(articles: Article[]): ArticleCluster[] {
  const groups = clusterByTFIDF(articles, 0.15);

  return groups
    .filter((g) => g.length > 0)
    .map((group, i) => {
      const keywords = extractTopKeywords(group, 3);
      const topic = keywords.join(" · ") || `STORY ${i + 1}`;

      // Score articles using their cluster siblings as corroboration
      const scoredArticles = scoreArticlesInCluster(group);
      const clusterScores = scoreCluster(scoredArticles);

      const dates = scoredArticles.map((a) => a.publishedAt).sort();

      return {
        id: `cluster-${slugify(topic)}-${i}`,
        topic,
        articles: scoredArticles,
        articleCount: scoredArticles.length,
        avgValidity: clusterScores.trustAggregate,
        sources: Array.from(new Map(scoredArticles.map((a) => [a.source.domain, a.source])).values()),
        freshness: clusterScores.freshness,
        velocity: clusterScores.velocity,
        sourceDiversity: clusterScores.sourceDiversity,
        trustAggregate: clusterScores.trustAggregate,
        score: clusterScores.score,
        firstSeen: dates[0],
        lastUpdated: dates[dates.length - 1],
      };
    })
    .sort((a, b) => b.score - a.score);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
