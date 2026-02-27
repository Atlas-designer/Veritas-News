import HudFrame from "@/components/ui/HudFrame";
import SourceBadge from "@/components/SourceBadge";
import TrustMeter from "@/components/ui/TrustMeter";
import type { Source } from "@/types";

const mockComparisons = [
  {
    topic: "CLIMATE SUMMIT",
    articles: [
      {
        source: {
          id: "reuters",
          name: "Reuters",
          domain: "reuters.com",
          bias: "CENTER" as const,
          factualRating: 95,
        },
        headline: "Global Summit Reaches Landmark Climate Agreement",
        tone: "Measured, factual reporting",
        sentiment: 0.2,
        validityScore: 94,
      },
      {
        source: {
          id: "cnn",
          name: "CNN",
          domain: "cnn.com",
          bias: "LEFT" as const,
          factualRating: 65,
        },
        headline: "Historic Victory: World Leaders Finally Act on Climate Crisis",
        tone: "Celebratory, emphasizes urgency",
        sentiment: 0.6,
        validityScore: 72,
      },
      {
        source: {
          id: "fox",
          name: "Fox News",
          domain: "foxnews.com",
          bias: "RIGHT" as const,
          factualRating: 55,
        },
        headline:
          "Climate Deal Could Cost Taxpayers Trillions in New Regulations",
        tone: "Critical, focuses on economic impact",
        sentiment: -0.5,
        validityScore: 48,
      },
    ],
  },
  {
    topic: "AI SPENDING",
    articles: [
      {
        source: {
          id: "wsj",
          name: "Wall Street Journal",
          domain: "wsj.com",
          bias: "RIGHT_CENTER" as const,
          factualRating: 85,
        },
        headline: "Tech Sector AI Investment Hits $200B as Returns Remain Unclear",
        tone: "Analytical, cautious",
        sentiment: -0.2,
        validityScore: 87,
      },
      {
        source: {
          id: "nyt",
          name: "NY Times",
          domain: "nytimes.com",
          bias: "LEFT_CENTER" as const,
          factualRating: 82,
        },
        headline: "The AI Gold Rush: Big Tech Bets Big While Workers Worry",
        tone: "Human interest, labor concerns",
        sentiment: -0.4,
        validityScore: 76,
      },
      {
        source: {
          id: "ap",
          name: "Associated Press",
          domain: "apnews.com",
          bias: "CENTER" as const,
          factualRating: 96,
        },
        headline:
          "Major Tech Companies Report Record Quarterly AI Spending of $200B",
        tone: "Straightforward, data-focused",
        sentiment: 0.0,
        validityScore: 91,
      },
    ],
  },
];

export default function ComparePage() {
  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="font-display text-xl lg:text-2xl font-bold tracking-wider text-vn-cyan text-glow-cyan">
          BIAS COMPARISON
        </h1>
        <p className="text-vn-text-dim text-sm mt-1">
          Same story, different perspectives
        </p>
      </header>

      {mockComparisons.map((comp) => (
        <div key={comp.topic} className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-vn-orange/50 to-transparent" />
            <span className="data-readout text-vn-orange text-xs">
              #{comp.topic}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-vn-orange/50 to-transparent" />
          </div>

          <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
            {comp.articles.map((art, i) => (
              <HudFrame key={i}>
                <div className="flex justify-between items-start mb-3">
                  <SourceBadge source={art.source} />
                  <TrustMeter
                    score={art.validityScore}
                    size={44}
                    showLabel={false}
                  />
                </div>
                <h3 className="text-sm font-semibold text-vn-text mb-2">
                  {art.headline}
                </h3>
                <p className="text-xs text-vn-text-dim italic">{art.tone}</p>
              </HudFrame>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
