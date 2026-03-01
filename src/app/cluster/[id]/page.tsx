"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArticleCluster } from "@/types";
import { fetchArticles } from "@/lib/api/client";
import { buildClusters } from "@/lib/clustering/scorer";
import { mockArticles } from "@/lib/mock/data";
import HudFrame from "@/components/ui/HudFrame";
import TrustMeter from "@/components/ui/TrustMeter";
import ArticleCard from "@/components/ArticleCard";
import SourceBadge from "@/components/SourceBadge";
import Link from "next/link";
import { FeedSkeleton } from "@/components/ui/Skeleton";

export default function ClusterPage() {
  const { id } = useParams<{ id: string }>();
  const [cluster, setCluster] = useState<ArticleCluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = cluster?.articles[0]?.title ?? "Veritas News Story";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user dismissed — do nothing
        return;
      }
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [cluster]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await fetchArticles();
        const articles =
          result.articles.length > 0 ? result.articles : mockArticles;
        const clusters = buildClusters(articles);
        const decoded = decodeURIComponent(id);
        const found = clusters.find((c) => c.id === decoded);
        setCluster(found ?? null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <FeedSkeleton />
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="text-center py-20">
        <span className="data-readout text-vn-red">CLUSTER NOT FOUND</span>
        <div className="mt-4">
          <Link
            href="/"
            className="data-readout text-vn-cyan text-xs hover:text-glow-cyan"
          >
            &larr; BACK TO FEED
          </Link>
        </div>
      </div>
    );
  }

  // Up to 3 articles with non-empty summaries for the summary panel
  const summaryArticles = cluster.articles
    .filter((a) => a.summary?.trim())
    .slice(0, 3);

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/"
          className="data-readout text-vn-cyan text-xs hover:text-glow-cyan"
        >
          &larr; BACK TO FEED
        </Link>
        <button
          onClick={handleShare}
          className="data-readout text-[10px] px-3 py-1.5 rounded-sm border border-vn-border text-vn-text-dim hover:border-vn-cyan/40 hover:text-vn-cyan transition-all"
        >
          {copied ? "✓ COPIED" : "⤴ SHARE"}
        </button>
      </div>

      {/* Cluster header */}
      <HudFrame className="mb-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="data-readout text-[10px] text-vn-orange mb-2">
              STORY CLUSTER
            </div>
            <h1 className="font-display text-lg font-bold text-vn-cyan text-glow-cyan tracking-wide">
              #{cluster.topic}
            </h1>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="data-readout text-[10px] text-vn-cyan">
                {cluster.articleCount} articles
              </span>
              <span className="data-readout text-[10px] text-vn-text-dim">
                {cluster.sources.length} unique sources
              </span>
              {cluster.lastUpdated && (
                <span className="data-readout text-[10px] text-vn-text-dim">
                  Last: {getTimeAgo(cluster.lastUpdated)}
                </span>
              )}
            </div>
          </div>
          <TrustMeter
            score={cluster.trustAggregate ?? cluster.avgValidity}
            size={72}
          />
        </div>
      </HudFrame>

      {/* Article summary */}
      <HudFrame title="STORY SUMMARY" className="mb-4">
        {summaryArticles.length > 0 ? (
          <div className="space-y-4">
            {summaryArticles.map((article) => (
              <div key={article.id}>
                <p className="text-sm text-vn-text leading-relaxed">
                  {article.summary}
                </p>
                <p className="data-readout text-[9px] text-vn-text-dim mt-1.5">
                  VIA {article.source.name.toUpperCase()} · {getTimeAgo(article.publishedAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="data-readout text-[10px] text-vn-text-dim">
            NO SUMMARY AVAILABLE
          </p>
        )}
      </HudFrame>

      {/* Sources overview */}
      <HudFrame title="SOURCES REPORTING" className="mb-4">
        <div className="flex flex-wrap gap-2">
          {cluster.sources.map((src) => (
            <div
              key={src.id}
              className="px-2 py-1 bg-vn-bg border border-vn-border rounded-sm"
            >
              <SourceBadge source={src} />
            </div>
          ))}
        </div>
      </HudFrame>

      {/* Articles in cluster */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-vn-cyan/50 to-transparent" />
          <span className="data-readout text-vn-cyan text-xs">
            ALL ARTICLES ({cluster.articleCount})
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-vn-cyan/50 to-transparent" />
        </div>
        {cluster.articles.map((article, i) => (
          <ArticleCard key={article.id} article={article} index={i} />
        ))}
      </div>
    </div>
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
