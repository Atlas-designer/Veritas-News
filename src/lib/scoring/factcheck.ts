import { FactCheckResult } from "@/types";

const GOOGLE_FACTCHECK_API =
  "https://factchecktools.googleapis.com/v1alpha1/claims:search";

/**
 * Search for fact checks related to a claim.
 * Uses Google Fact Check Tools API (free, no key required for limited use).
 * Falls back to empty results if unavailable.
 */
export async function searchFactChecks(
  query: string,
  apiKey?: string
): Promise<FactCheckResult[]> {
  try {
    const params = new URLSearchParams({
      query,
      languageCode: "en",
      ...(apiKey && { key: apiKey }),
    });

    const response = await fetch(`${GOOGLE_FACTCHECK_API}?${params}`);

    if (!response.ok) {
      console.warn("Fact check API unavailable:", response.status);
      return [];
    }

    const data = await response.json();
    if (!data.claims) return [];

    return data.claims.map((claim: any) => {
      const review = claim.claimReview?.[0];
      return {
        claim: claim.text || query,
        rating: mapRating(review?.textualRating || ""),
        source: review?.publisher?.name || "Unknown",
        url: review?.url || "",
      };
    });
  } catch (error) {
    console.warn("Fact check lookup failed:", error);
    return [];
  }
}

/**
 * Map various textual ratings from fact-checkers to standardized values.
 */
function mapRating(textual: string): FactCheckResult["rating"] {
  const lower = textual.toLowerCase();

  if (
    lower.includes("true") &&
    !lower.includes("false") &&
    !lower.includes("partly") &&
    !lower.includes("mostly")
  ) {
    return "TRUE";
  }
  if (lower.includes("mostly true") || lower.includes("mostly correct")) {
    return "MOSTLY_TRUE";
  }
  if (
    lower.includes("mixed") ||
    lower.includes("partly") ||
    lower.includes("half")
  ) {
    return "MIXED";
  }
  if (
    lower.includes("mostly false") ||
    lower.includes("mostly incorrect")
  ) {
    return "MOSTLY_FALSE";
  }
  if (
    lower.includes("false") ||
    lower.includes("pants on fire") ||
    lower.includes("incorrect")
  ) {
    return "FALSE";
  }

  return "MIXED";
}
