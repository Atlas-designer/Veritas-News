import HudFrame from "@/components/ui/HudFrame";
import TrustMeter from "@/components/ui/TrustMeter";
import SourceBadge from "@/components/SourceBadge";
import SentimentBar from "@/components/SentimentBar";
import WhyThisScore from "@/components/WhyThisScore";
import { mockArticles } from "@/lib/mock/data";
import { calculateValidity } from "@/lib/scoring/engine";
import Link from "next/link";

export default function ArticlePage({ params }: { params: { id: string } }) {
  const article = mockArticles.find((a) => a.id === params.id);

  if (!article) {
    return (
      <div className="text-center py-20">
        <span className="data-readout text-vn-red">ARTICLE NOT FOUND</span>
        <div className="mt-4">
          <Link href="/" className="data-readout text-vn-cyan text-xs">
            &larr; BACK TO FEED
          </Link>
        </div>
      </div>
    );
  }

  // Use stored breakdown if available (from cluster engine),
  // otherwise compute a fresh one from the mock data siblings
  const scoringResult =
    article.scoringBreakdown ??
    calculateValidity(
      article,
      mockArticles.filter((a) => a.id !== article.id),
      []
    );

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/"
        className="data-readout text-vn-cyan text-xs hover:text-glow-cyan mb-4 inline-block"
      >
        &larr; BACK TO FEED
      </Link>

      {/* Article header */}
      <HudFrame variant={article.isBreaking ? "alert" : "default"}>
        {article.isBreaking && (
          <div className="breaking-pulse rounded-sm px-2 py-1 mb-3 inline-flex items-center gap-2">
            <span
              className="status-dot"
              style={{ backgroundColor: "#ff2d2d", boxShadow: "0 0 6px #ff2d2d" }}
            />
            <span className="data-readout text-vn-red text-[10px]">BREAKING</span>
          </div>
        )}

        <SourceBadge source={article.source} />

        <h1 className="text-lg lg:text-xl font-semibold text-vn-text mt-3 mb-4 leading-snug">
          {article.title}
        </h1>

        <div className="flex items-start gap-6 mb-4">
          <TrustMeter score={scoringResult.overall} size={80} />
          <div className="flex-1">
            <p className="text-sm text-vn-text-dim leading-relaxed">
              {article.summary}
            </p>
          </div>
        </div>

        <SentimentBar sentiment={article.sentiment} />
      </HudFrame>

      {/* Why This Score — full breakdown */}
      <div className="mt-4">
        <WhyThisScore result={scoringResult} compact={false} />
      </div>

      {/* Corroboration sources */}
      {article.cluster && article.cluster.sources.length > 0 && (
        <HudFrame title="CORROBORATION MAP" className="mt-4">
          <div className="text-center py-2">
            <span className="font-mono text-3xl font-bold text-vn-cyan">
              {article.corroborationCount}
            </span>
            <p className="data-readout text-[10px] text-vn-text-dim mt-1">
              INDEPENDENT SOURCES REPORTING
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {article.cluster.sources.map((src) => (
              <span
                key={src.id}
                className="px-2 py-1 bg-vn-cyan/10 border border-vn-cyan/20 rounded-sm text-[10px] font-mono text-vn-cyan"
              >
                {src.name}
              </span>
            ))}
          </div>
        </HudFrame>
      )}

      {/* External link */}
      <div className="mt-4 pb-4">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="data-readout text-[10px] text-vn-cyan border border-vn-cyan/30 px-4 py-2 rounded-sm hover:bg-vn-cyan/10 transition-all inline-flex items-center gap-2"
        >
          READ ORIGINAL SOURCE ↗
        </a>
      </div>
    </div>
  );
}
