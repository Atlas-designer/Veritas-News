"use client";

/**
 * EPIC 7.1 — Leaflet OSM map with CARTO dark tiles
 *
 * - Uses CARTO Dark Matter tiles (free, no key)
 * - Custom HUD-style divIcon markers coloured by trust score
 * - Popup on click shows cluster topic + trust + source count
 * - Clicking a marker navigates to /cluster/[id] via onClusterClick
 *
 * Loaded via next/dynamic with ssr:false — this file never runs server-side.
 */

// Leaflet CSS must be imported before the component is used
import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { ArticleCluster } from "@/types";
import { geoTagClusters } from "@/lib/geo/locations";

interface Props {
  clusters: ArticleCluster[];
  onClusterClick?: (clusterId: string) => void;
}

function trustColor(score: number): string {
  if (score >= 85) return "#00ff88";
  if (score >= 60) return "#00e5ff";
  if (score >= 30) return "#ff8c00";
  return "#ff2d2d";
}

export default function LeafletMapComponent({ clusters, onClusterClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [20, 10],
        zoom: 2,
        minZoom: 1,
        maxZoom: 12,
        zoomControl: true,
        attributionControl: true,
      });

      mapRef.current = map;

      // CARTO Dark Matter — free, no API key, dark HUD-compatible
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' +
            ' &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Geo-tag clusters and add markers
      const tagged = geoTagClusters(clusters);

      tagged.forEach(({ id, topic, lat, lon, locationName }) => {
        const cluster = clusters.find((c) => c.id === id);
        const trust = Math.round(
          cluster?.trustAggregate ?? cluster?.avgValidity ?? 50
        );
        const color = trustColor(trust);

        // Glowing dot marker — custom divIcon, no external images needed
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:12px;height:12px;border-radius:50%;
            background:${color};border:2px solid ${color};
            box-shadow:0 0 10px ${color},0 0 20px ${color}55;
            cursor:pointer;
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          popupAnchor: [0, -10],
        });

        const marker = L.marker([lat, lon], { icon }).addTo(map);

        // Dark HUD popup
        const popupHtml = `
          <div class="vn-map-popup">
            <div class="vn-map-popup__region">${locationName.toUpperCase()}</div>
            <div class="vn-map-popup__topic">${topic}</div>
            <div class="vn-map-popup__trust" style="color:${color}">
              TRUST: ${trust}
            </div>
            ${cluster ? `<div class="vn-map-popup__sources">${cluster.articleCount} sources</div>` : ""}
          </div>
        `;

        marker.bindPopup(popupHtml, { closeButton: false });

        if (onClusterClick) {
          marker.on("click", () => onClusterClick(id));
        }
      });

      // Leaflet sometimes needs a nudge to render tiles on dynamic mount
      setTimeout(() => map.invalidateSize(), 120);
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once; parent uses key prop to remount on cluster change

  return (
    <div className="relative w-full h-[calc(100dvh-21rem)] min-h-[260px] lg:h-[480px] rounded-sm overflow-hidden">
      {/* Map canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD corner brackets — rendered above the map (z-[400] clears Leaflet's z-index) */}
      <div className="absolute inset-0 pointer-events-none z-[400]">
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-vn-cyan/70" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-vn-cyan/70" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-vn-cyan/70" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-vn-cyan/70" />
      </div>
    </div>
  );
}
