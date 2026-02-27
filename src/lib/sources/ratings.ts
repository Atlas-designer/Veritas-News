import { Source } from "@/types";

/**
 * Pre-seeded source reliability database.
 * Based on publicly available media reliability assessments
 * from Media Bias/Fact Check, AllSides, and Ad Fontes Media.
 *
 * factualRating: 0-100 factual reporting score
 * bias: Political leaning classification
 */
export const sourceDatabase: Record<string, Source> = {
  "apnews.com": {
    id: "ap",
    name: "Associated Press",
    domain: "apnews.com",
    bias: "CENTER",
    factualRating: 96,
  },
  "reuters.com": {
    id: "reuters",
    name: "Reuters",
    domain: "reuters.com",
    bias: "CENTER",
    factualRating: 95,
  },
  "bbc.com": {
    id: "bbc",
    name: "BBC News",
    domain: "bbc.com",
    bias: "LEFT_CENTER",
    factualRating: 90,
  },
  // BBC article links often resolve to bbc.co.uk — treat as identical
  "bbc.co.uk": {
    id: "bbc",
    name: "BBC News",
    domain: "bbc.co.uk",
    bias: "LEFT_CENTER",
    factualRating: 90,
  },
  "aljazeera.com": {
    id: "aljazeera",
    name: "Al Jazeera",
    domain: "aljazeera.com",
    bias: "LEFT_CENTER",
    factualRating: 75,
  },
  "npr.org": {
    id: "npr",
    name: "NPR",
    domain: "npr.org",
    bias: "LEFT_CENTER",
    factualRating: 88,
  },
  "wsj.com": {
    id: "wsj",
    name: "Wall Street Journal",
    domain: "wsj.com",
    bias: "RIGHT_CENTER",
    factualRating: 85,
  },
  "nytimes.com": {
    id: "nyt",
    name: "New York Times",
    domain: "nytimes.com",
    bias: "LEFT_CENTER",
    factualRating: 82,
  },
  "washingtonpost.com": {
    id: "wapo",
    name: "Washington Post",
    domain: "washingtonpost.com",
    bias: "LEFT_CENTER",
    factualRating: 80,
  },
  "theguardian.com": {
    id: "guardian",
    name: "The Guardian",
    domain: "theguardian.com",
    bias: "LEFT_CENTER",
    factualRating: 78,
  },
  "politico.com": {
    id: "politico",
    name: "Politico",
    domain: "politico.com",
    bias: "LEFT_CENTER",
    factualRating: 77,
  },
  "cnn.com": {
    id: "cnn",
    name: "CNN",
    domain: "cnn.com",
    bias: "LEFT",
    factualRating: 65,
  },
  "msnbc.com": {
    id: "msnbc",
    name: "MSNBC",
    domain: "msnbc.com",
    bias: "LEFT",
    factualRating: 58,
  },
  "foxnews.com": {
    id: "fox",
    name: "Fox News",
    domain: "foxnews.com",
    bias: "RIGHT",
    factualRating: 55,
  },
  "huffpost.com": {
    id: "huffpost",
    name: "HuffPost",
    domain: "huffpost.com",
    bias: "LEFT",
    factualRating: 50,
  },
  "dailywire.com": {
    id: "dailywire",
    name: "Daily Wire",
    domain: "dailywire.com",
    bias: "RIGHT",
    factualRating: 45,
  },
  "breitbart.com": {
    id: "breitbart",
    name: "Breitbart",
    domain: "breitbart.com",
    bias: "RIGHT",
    factualRating: 30,
  },
};

/**
 * Look up source reliability by domain.
 */
export function getSourceRating(domain: string): Source | null {
  const normalized = domain.replace(/^www\./, "").toLowerCase();
  return sourceDatabase[normalized] ?? null;
}

/**
 * Get all sources sorted by factual rating (highest first).
 */
export function getSourcesByReliability(): Source[] {
  return Object.values(sourceDatabase).sort(
    (a, b) => b.factualRating - a.factualRating
  );
}
