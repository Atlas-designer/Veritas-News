import { Source } from "@/types";

/**
 * Words that inflate importance / provoke emotion without adding information.
 * Each hit applies a small penalty to the source's trust score.
 */
const SENSATIONAL_MARKERS = [
  "bombshell", "shocking", "explosive", "stunning", "unbelievable",
  "you won't believe", "won't believe", "destroys", "obliterates", "annihilates",
  "slams", "blasts", "rips", "shreds", "torches", "nukes",
  "exposed", "exposes", "secret", "they don't want you to know",
  "mainstream media won't", "cover-up", "coverup", "scandal",
  "outrage", "outraged", "fury", "furious", "meltdown",
  "!!!", "must watch", "must read", "wake up",
];

/**
 * Signals that suggest the article is grounded in verifiable evidence.
 * Each hit adds a small bonus to the source's trust score.
 */
const EVIDENCE_MARKERS = [
  "study", "studies", "research", "researchers", "analysis",
  "report", "reports", "data", "statistics", "figures",
  "according to", "officials said", "officials say", "confirmed by",
  "peer-reviewed", "published in", "journal", "university", "institute",
  "survey", "poll", "documents show", "records show",
];

export interface TrustBaselineResult {
  source: Source;
  compositeScore: number;
  breakdown: {
    base: number;
    sensationalityPenalty: number;
    corroborationBonus: number;
    evidenceBonus: number;
  };
  signals: { label: string; delta: number; positive: boolean }[];
}

/**
 * Compute a trust baseline for a source using free, local signals.
 *
 * @param source         The source to evaluate
 * @param recentHeadlines  Sample of recent headlines from this source
 */
export function computeTrustBaseline(
  source: Source,
  recentHeadlines: string[] = []
): TrustBaselineResult {
  const base = source.factualRating;
  const headlines = recentHeadlines.map((h) => h.toLowerCase());

  // Signal 1: Sensationality — count sensational headlines, penalise
  const sensationalHits = headlines.filter((h) =>
    SENSATIONAL_MARKERS.some((m) => h.includes(m))
  ).length;
  const sensationalRate = recentHeadlines.length > 0
    ? sensationalHits / recentHeadlines.length
    : 0;
  const sensationalityPenalty = Math.round(Math.min(20, sensationalRate * 40));

  // Signal 2: Evidence — reward citations and data references
  const evidenceHits = headlines.filter((h) =>
    EVIDENCE_MARKERS.some((m) => h.includes(m))
  ).length;
  const evidenceRate = recentHeadlines.length > 0
    ? evidenceHits / recentHeadlines.length
    : 0;
  const evidenceBonus = Math.round(Math.min(10, evidenceRate * 20));

  // Signal 3: Corroboration — wired in from cluster data in EPIC 3.3
  // Placeholder value; updated by applyCorroborationBonus()
  const corroborationBonus = 0;

  const compositeScore = Math.max(
    0,
    Math.min(100, base - sensationalityPenalty + corroborationBonus + evidenceBonus)
  );

  const signals: TrustBaselineResult["signals"] = [
    { label: `Base factual rating (${source.name})`, delta: base, positive: true },
  ];
  if (sensationalityPenalty > 0) {
    signals.push({
      label: `Sensational language in ${sensationalHits} of ${recentHeadlines.length} headlines`,
      delta: -sensationalityPenalty,
      positive: false,
    });
  }
  if (evidenceBonus > 0) {
    signals.push({
      label: `Evidence-based language in ${evidenceHits} of ${recentHeadlines.length} headlines`,
      delta: evidenceBonus,
      positive: true,
    });
  }

  return {
    source,
    compositeScore,
    breakdown: { base, sensationalityPenalty, corroborationBonus, evidenceBonus },
    signals,
  };
}

/**
 * Apply a corroboration bonus derived from cluster data.
 * Call this after clustering to update the score.
 *
 * @param baseline       Existing baseline result
 * @param clusterAppearances  Number of multi-source clusters this source appears in
 * @param totalClusters  Total clusters to normalise against
 */
export function applyCorroborationBonus(
  baseline: TrustBaselineResult,
  clusterAppearances: number,
  totalClusters: number
): TrustBaselineResult {
  const rate = totalClusters > 0 ? clusterAppearances / totalClusters : 0;
  const bonus = Math.round(Math.min(10, rate * 15));

  const updated = {
    ...baseline,
    breakdown: { ...baseline.breakdown, corroborationBonus: bonus },
    compositeScore: Math.max(
      0,
      Math.min(
        100,
        baseline.breakdown.base
        - baseline.breakdown.sensationalityPenalty
        + bonus
        + baseline.breakdown.evidenceBonus
      )
    ),
  };

  if (bonus > 0) {
    updated.signals = [
      ...baseline.signals,
      {
        label: `Corroborated in ${clusterAppearances} of ${totalClusters} multi-source clusters`,
        delta: bonus,
        positive: true,
      },
    ];
  }

  return updated;
}
