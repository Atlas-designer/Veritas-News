import { Article, FactCheckResult, ScoringResult, Source } from "@/types";

/**
 * Scoring weights — corroboration is the strongest signal.
 * If many independent outlets report the same thing, it's likely true.
 */
const WEIGHTS = {
  corroboration: 0.4,
  sourceReliability: 0.3,
  factCheck: 0.2,
  consistency: 0.1,
};

/**
 * Calculate the overall validity score for an article.
 */
export function calculateValidity(
  article: Article,
  relatedArticles: Article[],
  factChecks: FactCheckResult[]
): ScoringResult {
  const corroboration = calculateCorroboration(relatedArticles);
  const sourceReliability = calculateSourceReliability(article.source);
  const factCheck = calculateFactCheckScore(factChecks);
  const consistency = calculateConsistency(article, relatedArticles);

  const overall = Math.round(
    corroboration * WEIGHTS.corroboration +
      sourceReliability * WEIGHTS.sourceReliability +
      factCheck * WEIGHTS.factCheck +
      consistency * WEIGHTS.consistency
  );

  return {
    overall: clamp(overall, 0, 100),
    corroboration,
    sourceReliability,
    factCheck,
    consistency,
    breakdown: [
      {
        label: "Corroboration",
        score: corroboration,
        weight: WEIGHTS.corroboration,
      },
      {
        label: "Source Reliability",
        score: sourceReliability,
        weight: WEIGHTS.sourceReliability,
      },
      { label: "Fact Check", score: factCheck, weight: WEIGHTS.factCheck },
      {
        label: "Consistency",
        score: consistency,
        weight: WEIGHTS.consistency,
      },
    ],
  };
}

/**
 * How many independent sources report the same story.
 * More unique parent organizations = higher score.
 */
function calculateCorroboration(relatedArticles: Article[]): number {
  const uniqueSources = new Set(relatedArticles.map((a) => a.source.domain));
  const count = uniqueSources.size;

  if (count === 0) return 5;
  if (count === 1) return 15;
  if (count === 2) return 30;
  if (count <= 4) return 50;
  if (count <= 7) return 70;
  if (count <= 11) return 85;
  return 95;
}

/**
 * Pre-rated trust level of the publishing outlet.
 */
function calculateSourceReliability(source: Source): number {
  return source.factualRating;
}

/**
 * Score based on fact-checking organization verdicts.
 */
function calculateFactCheckScore(factChecks: FactCheckResult[]): number {
  if (factChecks.length === 0) return 50; // No data = neutral

  const ratingValues: Record<string, number> = {
    TRUE: 100,
    MOSTLY_TRUE: 80,
    MIXED: 50,
    MOSTLY_FALSE: 20,
    FALSE: 0,
  };

  const total = factChecks.reduce(
    (sum, fc) => sum + (ratingValues[fc.rating] ?? 50),
    0
  );

  return Math.round(total / factChecks.length);
}

/**
 * Measures agreement across sources using sentiment variance.
 * Low variance = high consistency = sources agree on tone/facts.
 */
function calculateConsistency(
  _article: Article,
  relatedArticles: Article[]
): number {
  if (relatedArticles.length < 2) return 50;

  const sentiments = relatedArticles.map((a) => a.sentiment);
  const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const variance =
    sentiments.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
    sentiments.length;

  // Low variance = high consistency
  return Math.max(20, Math.round(100 - variance * 80));
}

/**
 * Keyword-based Jaccard similarity for article clustering.
 * Returns 0-1 score.
 */
export function calculateSimilarity(titleA: string, titleB: string): number {
  const wordsA = extractKeywords(titleA);
  const wordsB = extractKeywords(titleB);

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const arrA = Array.from(wordsA);
  const arrB = Array.from(wordsB);
  const intersection = new Set(arrA.filter((w) => wordsB.has(w)));
  const union = new Set(arrA.concat(arrB));

  return intersection.size / union.size;
}

/**
 * Extract meaningful keywords, stripping stop words.
 */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "this", "that", "these", "those",
    "it", "its", "as", "not", "no", "new", "says", "said",
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
  );
}

/**
 * Group articles into clusters by headline similarity.
 */
export function clusterArticles(
  articles: Article[],
  threshold = 0.25
): Article[][] {
  const clusters: Article[][] = [];
  const assigned = new Set<string>();

  for (const article of articles) {
    if (assigned.has(article.id)) continue;

    const cluster = [article];
    assigned.add(article.id);

    for (const other of articles) {
      if (assigned.has(other.id)) continue;
      const similarity = calculateSimilarity(article.title, other.title);
      if (similarity >= threshold) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
