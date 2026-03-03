"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import HudFrame from "@/components/ui/HudFrame";
import { ArticleCluster } from "@/types";

interface Props {
  clusters: ArticleCluster[];
  onClose: () => void;
}

const CLIENT_TTL = 60 * 60 * 1000;

interface WordToken {
  word: string;
  start: number;
  end: number;
}

// Split briefing text into paragraphs of word tokens with absolute char positions
function tokenize(text: string): WordToken[][] {
  const paras = text.split("\n\n").filter(Boolean);
  let searchFrom = 0;
  return paras.map((para) => {
    const paraStart = text.indexOf(para, searchFrom);
    searchFrom = paraStart + para.length;
    const tokens: WordToken[] = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(para)) !== null) {
      tokens.push({
        word: m[0],
        start: paraStart + m.index,
        end: paraStart + m.index + m[0].length,
      });
    }
    return tokens;
  });
}

export default function BriefingPanel({ clusters, onClose }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // TTS state
  const [speaking, setSpeaking] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const [currentCharIdx, setCurrentCharIdx] = useState(-1);
  const currentCharIdxRef = useRef(-1);
  const ttsRateRef = useRef(1);

  // Hold detection
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHoldRef = useRef(false);

  // Fetch briefing
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
        if (data.error) { setError(true); return; }
        setText(data.text);
        setGeneratedAt(data.generatedAt);
        try {
          sessionStorage.setItem(
            "vn:briefing",
            JSON.stringify({ text: data.text, generatedAt: data.generatedAt, ts: Date.now() })
          );
        } catch {}
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cancel TTS on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const startSpeech = useCallback((charOffset: number, rate: number, fullText: string) => {
    window.speechSynthesis.cancel();
    const slice = fullText.slice(charOffset);
    const utterance = new SpeechSynthesisUtterance(slice);
    utterance.rate = rate;
    utterance.onboundary = (e) => {
      if (e.name === "word") {
        const abs = charOffset + e.charIndex;
        currentCharIdxRef.current = abs;
        setCurrentCharIdx(abs);
      }
    };
    utterance.onend = () => {
      setSpeaking(false);
      setCurrentCharIdx(-1);
      currentCharIdxRef.current = -1;
      setTtsRate(1);
      ttsRateRef.current = 1;
    };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, []);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setCurrentCharIdx(-1);
    currentCharIdxRef.current = -1;
    setTtsRate(1);
    ttsRateRef.current = 1;
  }, []);

  // Short press = play/stop; hold (600ms) = toggle 2× speed
  const handleRobotPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    didHoldRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      didHoldRef.current = true;
      if (!text) return;
      const newRate = ttsRateRef.current === 1 ? 2 : 1;
      ttsRateRef.current = newRate;
      setTtsRate(newRate);
      if (speaking) {
        startSpeech(Math.max(0, currentCharIdxRef.current), newRate, text);
      }
    }, 600);
  };

  const handleRobotPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (!didHoldRef.current) {
      if (speaking) {
        stopSpeech();
      } else if (text) {
        startSpeech(0, ttsRateRef.current, text);
      }
    }
    didHoldRef.current = false;
  };

  // Click body to close — browser won't fire onClick during a scroll/drag
  const handleBodyClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClose();
  };

  const parsedWords = text ? tokenize(text) : null;

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
              {/* Robot TTS button — press to play/stop, hold for 2× */}
              {!loading && text && (
                <button
                  onPointerDown={handleRobotPointerDown}
                  onPointerUp={handleRobotPointerUp}
                  onPointerLeave={() => {
                    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                  }}
                  className="relative select-none"
                  title={
                    speaking
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
                      speaking
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
            <p className="text-xs text-vn-red font-mono py-4">
              Failed to generate briefing. Ensure GROQ_API_KEY is set in your environment.
            </p>
          )}

          {/* Briefing text — click to close, words highlighted while speaking */}
          {!loading && parsedWords && (
            <div
              className="space-y-4 cursor-pointer select-none"
              onClick={handleBodyClick}
            >
              {parsedWords.map((words, pi) => (
                <p key={pi} className="text-[11px] text-vn-text font-mono leading-relaxed">
                  {words.map((token, wi) => {
                    const isActive =
                      currentCharIdx >= token.start && currentCharIdx < token.end;
                    return (
                      <span key={wi} className={isActive ? "text-green-400" : ""}>
                        {token.word}{" "}
                      </span>
                    );
                  })}
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
