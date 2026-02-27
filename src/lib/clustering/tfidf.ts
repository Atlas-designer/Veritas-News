// TF-IDF cosine similarity clustering — runs entirely in the browser, no paid APIs.

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "has", "have", "had", "will", "would", "could", "should", "may", "might",
  "can", "this", "that", "these", "those", "it", "its", "as", "not", "no",
  "new", "says", "said", "report", "reports", "over", "than", "more",
  "after", "before", "about", "up", "out", "into", "his", "her", "their",
  "they", "he", "she", "we", "us", "amid", "just", "now", "then", "when",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by document length
  for (const [term, count] of tf) {
    tf.set(term, count / tokens.length);
  }
  return tf;
}

interface TFIDFDoc {
  id: string;
  tokens: string[];
  tf: Map<string, number>;
  tfidf: Map<string, number>;
}

function buildDocs(
  articles: { id: string; title: string; summary?: string }[]
): TFIDFDoc[] {
  // Step 1: tokenize all docs
  const raw = articles.map((a) => {
    const text = `${a.title} ${a.summary ?? ""}`;
    const tokens = tokenize(text);
    return { id: a.id, tokens, tf: termFrequency(tokens) };
  });

  // Step 2: compute IDF across corpus
  const N = raw.length;
  const df = new Map<string, number>();
  for (const doc of raw) {
    for (const term of new Set(doc.tokens)) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1); // smoothed
  }

  // Step 3: apply TF-IDF
  return raw.map((doc) => ({
    ...doc,
    tfidf: new Map(
      Array.from(doc.tf).map(([term, tf]) => [
        term,
        tf * (idf.get(term) ?? 1),
      ])
    ),
  }));
}

function magnitude(vec: Map<string, number>): number {
  let sum = 0;
  for (const val of vec.values()) sum += val * val;
  return Math.sqrt(sum);
}

function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dot = 0;
  for (const [term, valA] of a) {
    const valB = b.get(term);
    if (valB !== undefined) dot += valA * valB;
  }
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Cluster articles using TF-IDF cosine similarity.
 * Articles with similarity >= threshold are grouped together.
 */
export function clusterByTFIDF<
  T extends { id: string; title: string; summary?: string }
>(articles: T[], threshold = 0.15): T[][] {
  if (articles.length === 0) return [];

  const docs = buildDocs(articles);
  const vecById = new Map(docs.map((d) => [d.id, d.tfidf]));

  const clusters: T[][] = [];
  const assigned = new Set<string>();

  for (const article of articles) {
    if (assigned.has(article.id)) continue;

    const cluster: T[] = [article];
    assigned.add(article.id);

    const vecA = vecById.get(article.id)!;

    for (const other of articles) {
      if (assigned.has(other.id)) continue;
      const vecB = vecById.get(other.id)!;
      if (cosineSimilarity(vecA, vecB) >= threshold) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Extract the top N keywords representing a cluster (by aggregated TF-IDF).
 */
export function extractTopKeywords(
  articles: { id: string; title: string; summary?: string }[],
  topN = 3
): string[] {
  const docs = buildDocs(articles);
  const aggregated = new Map<string, number>();

  for (const doc of docs) {
    for (const [term, score] of doc.tfidf) {
      aggregated.set(term, (aggregated.get(term) || 0) + score);
    }
  }

  return Array.from(aggregated.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term]) => term.toUpperCase());
}
