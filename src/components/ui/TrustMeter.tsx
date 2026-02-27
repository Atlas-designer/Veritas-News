"use client";

import { useEffect, useRef, useState } from "react";

interface TrustMeterProps {
  score: number; // 0-100
  size?: number;
  showLabel?: boolean;
}

function getColor(s: number) {
  if (s >= 85)
    return {
      stroke: "#00ff88",
      glow: "drop-shadow(0 0 4px rgba(0,255,136,0.5))",
    };
  if (s >= 60)
    return {
      stroke: "#00e5ff",
      glow: "drop-shadow(0 0 4px rgba(0,229,255,0.5))",
    };
  if (s >= 30)
    return {
      stroke: "#ff8c00",
      glow: "drop-shadow(0 0 4px rgba(255,140,0,0.5))",
    };
  return {
    stroke: "#ff2d2d",
    glow: "drop-shadow(0 0 4px rgba(255,45,45,0.5))",
  };
}

export default function TrustMeter({
  score,
  size = 56,
  showLabel = true,
}: TrustMeterProps) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect reduced motion preference
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setDisplayed(score);
      return;
    }

    const duration = 900; // ms
    const from = 0;
    const to = score;

    function step(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [score]);

  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayed / 100) * circumference;
  const color = getColor(displayed);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: color.glow }}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a2332"
          strokeWidth="3"
        />
        {/* Animated score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
        {/* Center score text — counter-rotate to read correctly */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color.stroke}
          fontSize={size * 0.28}
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
          transform={`rotate(90, ${size / 2}, ${size / 2})`}
        >
          {displayed}
        </text>
      </svg>
      {showLabel && (
        <span className="data-readout text-[9px] text-vn-text-dim">TRUST</span>
      )}
    </div>
  );
}
