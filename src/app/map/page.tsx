"use client";

/**
 * EPIC 7.1 — Global News Map page
 *
 * Loads clusters, geo-tags them via the offline lookup table,
 * then renders the Leaflet map. Uses next/dynamic with ssr:false
 * so Leaflet's browser-only APIs never run on the server.
 */

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import HudFrame from "@/components/ui/HudFrame";
import { fetchArticles } from "@/lib/api/client";
import { buildClusters } from "@/lib/clustering/scorer";
import { geoTagClusters } from "@/lib/geo/locations";
import { ArticleCluster } from "@/types";
import { mockArticles } from "@/lib/mock/data";

// Leaflet must only run in the browser
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 lg:h-[480px] bg-vn-panel border border-vn-border rounded-sm flex items-center justify-center">
      <span className="data-readout text-vn-text-dim text-xs animate-pulse">
        LOADING MAP...
      </span>
    </div>
  ),
});

export default function MapPage() {
  const router = useRouter();
  const [clusters, setClusters] = useState<ArticleCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinnedCount, setPinnedCount] = useState(0);

  useEffect(() => {
    fetchArticles()
      .then((result) => {
        const articles =
          result.usingDemo || result.articles.length === 0
            ? mockArticles
            : result.articles;
        const built = buildClusters(articles);
        setClusters(built);
        setPinnedCount(geoTagClusters(built).length);
      })
      .finally(() => setLoading(false));
  }, []);

  const avgTrust =
    clusters.length > 0
      ? Math.round(
          clusters.reduce(
            (s, c) => s + (c.trustAggregate ?? c.avgValidity),
            0
          ) / clusters.length
        )
      : 0;

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="font-display text-xl lg:text-2xl font-bold tracking-wider text-vn-cyan text-glow-cyan">
          GLOBAL NEWS MAP
        </h1>
        <p className="text-vn-text-dim text-sm mt-1">
          Geo-tagged clusters — tap a pin to explore
        </p>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          {
            label: "CLUSTERS",
            value: loading ? "—" : clusters.length.toString(),
            color: "text-vn-cyan",
          },
          {
            label: "PINNED",
            value: loading ? "—" : pinnedCount.toString(),
            color: "text-vn-orange",
          },
          {
            label: "AVG TRUST",
            value: loading ? "—" : clusters.length > 0 ? `${avgTrust}%` : "—",
            color: "text-vn-green",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-vn-panel border border-vn-border rounded-sm p-3 text-center"
          >
            <div className={`font-mono text-lg font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="data-readout text-vn-text-dim text-[10px]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      <HudFrame title="WORLD OVERVIEW" className="mb-6">
        {loading ? (
          <div className="w-full h-[calc(100dvh-21rem)] min-h-[260px] lg:h-[480px] bg-vn-panel border border-vn-border rounded-sm flex items-center justify-center">
            <span className="data-readout text-vn-text-dim text-xs animate-pulse">
              FETCHING INTEL...
            </span>
          </div>
        ) : (
          <LeafletMap
            key={clusters.length}
            clusters={clusters}
            onClusterClick={(id) =>
              router.push(`/cluster/${encodeURIComponent(id)}`)
            }
          />
        )}
      </HudFrame>

      <p className="text-center data-readout text-[9px] text-vn-text-dim">
        PINS REPRESENT GEO-TAGGED CLUSTERS · COLOUR = TRUST SCORE
      </p>
    </div>
  );
}
