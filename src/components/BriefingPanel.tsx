"use client";

import { useEffect, useState, useRef } from "react";
import HudFrame from "@/components/ui/HudFrame";
import { ArticleCluster } from "@/types";

interface Props {
  clusters: ArticleCluster[];
  onClose: () => void;
}

const CLIENT_TTL = 60 * 60 * 1000;

export default function BriefingPanel({ clusters, onClose }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TTS state
  const [speaking, setSpeaking] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const ttsRateRef = useRef(1);

  // Hold detection
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHoldRef = useRef(false);

  // Fetch briefing text
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("vn:briefing");
      if (raw) {
        const { text: t, generatedAt: g, ts } = JSON.parse(raw);
        if (Date.now() - ts < CLIENT_TTL) {
          setText(t);
          setGeneratedAt(g);
          setLoading(false);
          return;
        }
      }
    } catch {}

    const payload = clusters.slice(0, 10).map((c) => ({
      topic: c.topic,
      headline: c.articles[0]?.title ?? c.topic,
      sourceCount: c.sources.length,
      avgValidity: c.avgValidity,
    }));

    fetch("/api/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusters: payload }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setText(data.text);
        setGeneratedAt(data.generatedAt);
        try {
          sessionStorage.setItem(
            "vn:briefing",
            JSON.stringify({ text: data.text, generatedAt: data.generatedAt, ts: Date.now() })
          );
        } catch {}
      })
      .catch(() => setError("Failed to generate briefing"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  async function playAudio() {
    if (!text) return;

    // Reuse existing audio element if already loaded
    if (audioRef.current && blobUrlRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = ttsRateRef.current;
      audioRef.current.play();
      setSpeaking(true);
      return;
    }

    setAudioLoading(true);
    try {
      const res = await fetch("/api/briefing/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Voice unavailable");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audio.playbackRate = ttsRateRef.current;
      audio.onended = () => setSpeaking(false);
      audio.onpause = () => setSpeaking(false);
      audio.onplay = () => setSpeaking(true);
      audioRef.current = audio;
      audio.play();
    } catch (e) {
      setError(String(e));
    } finally {
      setAudioLoading(false);
    }
  }

  function stopAudio() {
    audioRef.current?.pause();
    setSpeaking(false);
  }

  // Short press = play/stop; hold 600ms = toggle 2× speed
  const handleRobotPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    didHoldRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      didHoldRef.current = true;
      const newRate = ttsRateRef.current === 1 ? 2 : 1;
      ttsRateRef.current = newRate;
      setTtsRate(newRate);
      if (audioRef.current) audioRef.current.playbackRate = newRate;
    }, 600);
  };

  const handleRobotPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (!didHoldRef.current) {
      if (speaking) {
        stopAudio();
      } else {
        playAudio();
      }
    }
    didHoldRef.current = false;
  };

  // Click body to close
  const handleBodyClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClose();
  };

  const titleNode = (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/robot.GIF" alt="" className="w-5 h-5 object-contain inline-block" />
      AI DAILY BRIEFING
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <HudFrame title={titleNode}>
          {/* Meta row */}
          <div className="flex items-center justify-between mb-4">
            <span className="data-readout text-[9px] text-vn-text-dim tracking-widest">
              {generatedAt
                ? `GENERATED · ${new Date(generatedAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : loading
                ? "GENERATING..."
                : ""}
            </span>
            <div className="flex items-center gap-3">
              {/* Robot TTS button */}
              {!loading && text && (
                <button
                  onPointerDown={handleRobotPointerDown}
                  onPointerUp={handleRobotPointerUp}
                  onPointerLeave={() => {
                    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                  }}
                  className="relative select-none"
                  disabled={audioLoading}
                  title={
                    audioLoading
                      ? "Loading voice..."
                      : speaking
                      ? ttsRate === 2
                        ? "2× speed · press to stop"
                        : "Press to stop · hold for 2×"
                      : "Press to play · hold for 2×"
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/robot.GIF"
                    alt="Play briefing"
                    className={`w-8 h-8 object-contain transition-all ${
                      audioLoading
                        ? "opacity-40 animate-pulse"
                        : speaking
                        ? "drop-shadow-[0_0_8px_rgba(0,255,200,0.9)]"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    draggable={false}
                  />
                  {speaking && (
                    <span className="absolute -top-1 -right-1 text-[8px] font-mono font-bold text-vn-cyan leading-none">
                      {ttsRate === 2 ? "2×" : "▶"}
                    </span>
                  )}
                  {audioLoading && (
                    <span className="absolute -top-1 -right-1 text-[8px] font-mono text-vn-text-dim leading-none">
                      ···
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="data-readout text-[10px] text-vn-text-dim hover:text-vn-red transition-colors"
              >
                × CLOSE
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-10 text-center space-y-3">
              <p className="data-readout text-vn-cyan text-[10px] tracking-widest animate-pulse">
                GENERATING BRIEFING...
              </p>
              <p className="text-[10px] text-vn-text-dim font-mono">
                Analysing today&apos;s top stories
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <p className="text-xs text-vn-red font-mono py-2">
              {error}
            </p>
          )}

          {/* Briefing text — click to close */}
          {!loading && text && (
            <div
              className="space-y-4 cursor-pointer select-none"
              onClick={handleBodyClick}
            >
              {text.split("\n\n").filter(Boolean).map((para, i) => (
                <p key={i} className="text-[11px] text-vn-text font-mono leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[9px] text-vn-text-dim/40 font-mono mt-5 pt-3 border-t border-vn-border/30">
            AI-generated summary · Based on today&apos;s top headlines via Veritas sources · Cached hourly
          </p>
        </HudFrame>
      </div>
    </div>
  );
}
