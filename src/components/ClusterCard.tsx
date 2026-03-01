"use client";

import { useState } from "react";
import { ArticleCluster } from "@/types";
import HudFrame from "./ui/HudFrame";
import TrustMeter from "./ui/TrustMeter";
import SourceBadge from "./SourceBadge";
import Link from "next/link";

interface ClusterCardProps {
  cluster: ArticleCluster;
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days > 30) return "30d+";
  return `${days}d ago`;
}

function getVerdict(score: number): string {
  if (score >= 85) return "High confidence — widely corroborated";
  if (score >= 70) return "Likely accurate — well sourced";
  if (score >= 50) return "Mixed signals — verify independently";
  if (score >= 30) return "Low confidence — limited corroboration";
  return "Very low confidence — treat with scepticism";
}

function getBarColor(score: number): string {
  if (score >= 80) return "#5fb85f";
  if (score >= 60) return "#e8773a";
  if (score >= 40) return "#f5a55c";
  return "#e05848";
}

export default function ClusterCard({ cluster }: ClusterCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const topArticle = cluster.articles[0];
  // Prefer cluster.lastUpdated (most recent article publish time tracked by the engine)
  // over topArticle.publishedAt, which can be stale from certain RSS feeds (e.g. WSJ).
  const timeAgo = getTimeAgo(cluster.lastUpdated ?? topArticle?.publishedAt ?? "");
  const trustScore = Math.round(cluster.trustAggregate ?? cluster.avgValidity);

  // Breaking = very fresh (<2.5h → freshness >90) AND reported by 2+ independent outlets
  const isBreaking =
    (cluster.freshness ?? 0) > 90 &&
    (cluster.sourceDiversity ?? 0) >= 40;

  // WHY panel derived stats
  const corroborationPct = Math.min(100, cluster.articleCount * 20);
  const avgSourceTrust =
    cluster.sources.length > 0
      ? Math.round(
          cluster.sources.reduce((s, src) => s + src.factualRating, 0) /
            cluster.sources.length
        )
      : 50;

  return (
    <div>
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
              {/* Source badge + headline */}
              {topArticle && (
                <>
                  <SourceBadge source={topArticle.source} />
                  <h2 className="text-base lg:text-lg font-bold text-vn-text mt-2 mb-2 leading-snug">
                    {topArticle.title}
                  </h2>
                  {topArticle.summary && (
                    <p className="text-xs text-vn-text-dim mb-3 leading-relaxed line-clamp-2">
                      {topArticle.summary}
                    </p>
                  )}
                </>
              )}

              {/* Bottom metadata row */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="data-readout text-[10px] text-vn-cyan">
                  {cluster.articleCount} source{cluster.articleCount !== 1 ? "s" : ""}
                </span>
                <span className="data-readout text-[10px] text-vn-text-dim">
                  {timeAgo}
                </span>
              </div>
            </div>

            {/* Trust meter + WHY button */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <TrustMeter score={trustScore} size={56} />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowWhy((v) => !v);
                }}
                className="data-readout text-[9px] text-vn-text-dim hover:text-vn-cyan border border-vn-border hover:border-vn-cyan/40 px-2 py-0.5 rounded-sm transition-all"
              >
                {showWhy ? "CLOSE" : "WHY?"}
              </button>
            </div>
          </div>
        </HudFrame>
      </Link>

      {/* WHY THIS SCORE — inline expandable, outside the Link to prevent navigation */}
      {showWhy && (
        <div className="border border-vn-border border-t-0 bg-vn-panel/60 rounded-b-sm px-4 py-3 space-y-3">
          <div className="data-readout text-[9px] text-vn-cyan tracking-widest">
            WHY THIS SCORE?
          </div>

          {/* Corroboration bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="data-readout text-[9px] text-vn-text-dim">CORROBORATION</span>
              <span className="data-readout text-[9px]" style={{ color: getBarColor(corroborationPct) }}>
                {cluster.articleCount} source{cluster.articleCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="h-1 bg-vn-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${corroborationPct}%`, backgroundColor: getBarColor(corroborationPct) }}
              />
            </div>
          </div>

          {/* Source trust bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="data-readout text-[9px] text-vn-text-dim">SOURCE TRUST</span>
              <span className="data-readout text-[9px]" style={{ color: getBarColor(avgSourceTrust) }}>
                avg {avgSourceTrust}/100
              </span>
            </div>
            <div className="h-1 bg-vn-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${avgSourceTrust}%`, backgroundColor: getBarColor(avgSourceTrust) }}
              />
            </div>
          </div>

          {/* Verdict */}
          <p className="text-[11px] text-vn-text-dim leading-relaxed border-t border-vn-border/50 pt-2">
            {getVerdict(trustScore)}.{" "}
            {cluster.articleCount >= 2
              ? `${cluster.articleCount} independent outlets are covering this story.`
              : "Only one outlet has reported this story so far."}
          </p>
        </div>
      )}
    </div>
  );
}
