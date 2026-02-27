import { ArticleCluster } from "@/types";
import HudFrame from "./ui/HudFrame";
import TrustMeter from "./ui/TrustMeter";
import SourceBadge from "./SourceBadge";
import Link from "next/link";

interface ClusterCardProps {
  cluster: ArticleCluster;
}

export default function ClusterCard({ cluster }: ClusterCardProps) {
  const topArticle = cluster.articles[0];
  const timeAgo = topArticle ? getTimeAgo(topArticle.publishedAt) : "";
  // Breaking = very fresh (<2.5h → freshness >90) AND reported by 2+ independent outlets
  // sourceDiversity score of 40 = exactly 2 unique domains (uniqueDomains * 20)
  const isBreaking =
    (cluster.freshness ?? 0) > 90 &&
    (cluster.sourceDiversity ?? 0) >= 40;

  return (
    <Link href={`/cluster/${encodeURIComponent(cluster.id)}`}>
      <HudFrame
        variant={isBreaking ? "alert" : "default"}
        className="cursor-pointer"
      >
        {isBreaking && (
          <div className="breaking-pulse rounded-sm px-2 py-1 mb-3 inline-flex items-center gap-2">
            <span
              className="status-dot"
              style={{ backgroundColor: "#ff2d2d", boxShadow: "0 0 6px #ff2d2d" }}
            />
            <span className="data-readout text-vn-red text-[10px]">BREAKING</span>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {/* Topic keywords */}
            <div className="data-readout text-[10px] text-vn-orange mb-2">
              #{cluster.topic}
            </div>

            {/* Top headline */}
            {topArticle && (
              <>
                <SourceBadge source={topArticle.source} />
                <h2 className="text-sm lg:text-base font-semibold text-vn-text mt-2 mb-2 leading-snug">
                  {topArticle.title}
                </h2>
                {topArticle.summary && (
                  <p className="text-xs text-vn-text-dim mb-3 line-clamp-2">
                    {topArticle.summary}
                  </p>
                )}
              </>
            )}

            {/* Cluster metadata */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="data-readout text-[10px] text-vn-cyan">
                {cluster.articleCount} source{cluster.articleCount !== 1 ? "s" : ""}
              </span>
              {cluster.sourceDiversity !== undefined && (
                <span className="data-readout text-[10px] text-vn-green">
                  {cluster.sources.slice(0, 3).map((s) => s.name).join(" · ")}
                  {cluster.sources.length > 3 && ` +${cluster.sources.length - 3}`}
                </span>
              )}
              <span className="data-readout text-[10px] text-vn-text-dim">
                {timeAgo}
              </span>
            </div>

            {/* Cluster score bars */}
            {cluster.freshness !== undefined && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: "FRESH", value: cluster.freshness },
                  { label: "VELOCITY", value: cluster.velocity ?? 0 },
                  { label: "DIVERSITY", value: cluster.sourceDiversity ?? 0 },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between mb-0.5">
                      <span className="data-readout text-[8px] text-vn-text-dim">
                        {bar.label}
                      </span>
                      <span className="data-readout text-[8px] text-vn-cyan">
                        {bar.value}
                      </span>
                    </div>
                    <div className="h-0.5 bg-vn-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-vn-cyan rounded-full"
                        style={{ width: `${bar.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trust meter */}
          <div className="flex-shrink-0">
            <TrustMeter score={cluster.trustAggregate ?? cluster.avgValidity} size={60} />
          </div>
        </div>
      </HudFrame>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
