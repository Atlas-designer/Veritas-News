export interface Source {
  id: string;
  name: string;
  domain: string;
  bias: "LEFT" | "LEFT_CENTER" | "CENTER" | "RIGHT_CENTER" | "RIGHT";
  factualRating: number; // 0-100
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: Source;
  publishedAt: string;
  summary: string;
  sentiment: number;       // -1 (inflammatory) to 1 (very positive)
  validityScore: number;   // 0-100
  corroborationCount: number;
  cluster?: ArticleCluster;
  isBreaking?: boolean;
  scoringBreakdown?: ScoringResult; // populated after engine runs
}

export interface ArticleCluster {
  id: string;
  topic: string;
  articles: Article[];  // always present from buildClusters; add [] for legacy mock refs
  articleCount: number;
  avgValidity: number;
  sources: Source[];
  // EPIC 2 scoring
  freshness?: number;       // 0-100
  velocity?: number;        // articles/hour normalised 0-100
  sourceDiversity?: number; // unique domains 0-100
  trustAggregate?: number;  // avg validity
  score?: number;           // combined cluster score
  firstSeen?: string;
  lastUpdated?: string;
}

export interface FactCheckResult {
  claim: string;
  rating: "TRUE" | "MOSTLY_TRUE" | "MIXED" | "MOSTLY_FALSE" | "FALSE";
  source: string;
  url: string;
}

export interface ScoringResult {
  overall: number;
  corroboration: number;
  sourceReliability: number;
  factCheck: number;
  consistency: number;
  breakdown: {
    label: string;
    score: number;
    weight: number;
  }[];
}
