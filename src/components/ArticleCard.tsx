import { Article } from "@/types";
import HudFrame from "./ui/HudFrame";
import TrustMeter from "./ui/TrustMeter";
import SourceBadge from "./SourceBadge";

interface ArticleCardProps {
  article: Article;
  index: number;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const timeAgo = getTimeAgo(article.publishedAt);

  // Blend the computed validity score with the source's factual rating
  // so a lone article from a trusted outlet still shows a reasonable trust score
  const displayTrust = Math.round(
    (article.validityScore + article.source.factualRating) / 2
  );

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <HudFrame
        variant={article.isBreaking ? "alert" : "default"}
        className="animate-slide-up cursor-pointer"
      >
        {article.isBreaking && (
          <div className="breaking-pulse rounded-sm px-2 py-1 mb-3 inline-flex items-center gap-2">
            <span
              className="status-dot"
              style={{
                backgroundColor: "#ff2d2d",
                boxShadow: "0 0 6px #ff2d2d",
              }}
            />
            <span className="data-readout text-vn-red text-[10px]">
              BREAKING
            </span>
          </div>
        )}

        <div className="flex gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <SourceBadge source={article.source} />

            <h2 className="text-sm lg:text-base font-semibold text-vn-text mt-2 mb-2 leading-snug">
              {article.title}
            </h2>

            <p className="text-xs text-vn-text-dim mb-3 line-clamp-2">
              {article.summary}
            </p>

            <div className="flex items-center gap-4 mt-1">
              <span className="data-readout text-[10px] text-vn-text-dim">
                {timeAgo}
              </span>
              <span className="data-readout text-[10px] text-vn-cyan">
                {article.corroborationCount} sources
              </span>
              {article.cluster && (
                <span className="data-readout text-[10px] text-vn-orange">
                  #{article.cluster.topic}
                </span>
              )}
            </div>
          </div>

          {/* Trust meter */}
          <div className="flex-shrink-0">
            <TrustMeter score={displayTrust} size={60} />
          </div>
        </div>
      </HudFrame>
    </a>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
