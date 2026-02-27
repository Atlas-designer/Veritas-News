"use client";

import { useEffect, useState } from "react";
import type { Sport, ScoreEvent } from "@/lib/sports/scores";
import { fetchScores } from "@/lib/sports/scores";

// NOW  = current ESPN scoreboard (live + upcoming + recent results)
// 7D   = ESPN date-range last 7 days  (results only)
// 30D  = ESPN date-range last 30 days (results only)
type ViewMode = "now" | "7d" | "30d";

const TABS: { id: ViewMode; label: string; days: number }[] = [
  { id: "now", label: "NOW",       days: 0  },
  { id: "7d",  label: "LAST 7D",  days: 7  },
  { id: "30d", label: "LAST 30D", days: 30 },
];

interface Props {
  sport: Sport;
}

export default function ScoresPanel({ sport }: Props) {
  const [events, setEvents]   = useState<ScoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState<ViewMode>("now");

  useEffect(() => {
    setLoading(true);
    setEvents([]);
    const tab = TABS.find((t) => t.id === view)!;
    fetchScores(sport.id, tab.days)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [sport.id, view]);

  // For historical tabs, everything is a result
  const isHistorical = view !== "now";

  const live     = isHistorical ? [] : events.filter((e) => e.isLive);
  const upcoming = isHistorical ? [] : events.filter((e) => !e.isLive && e.status === "pre");
  const results  = (isHistorical ? events : events.filter((e) => e.status === "post"))
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const hasContent = live.length > 0 || upcoming.length > 0 || results.length > 0;

  return (
    <div className="border border-vn-border rounded-sm bg-vn-panel overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-vn-border">
        <div className="flex items-center gap-2">
          <span className="text-base">{sport.icon}</span>
          <span className="data-readout text-vn-cyan tracking-widest text-[11px]">
            {sport.label}
          </span>
          {live.length > 0 && (
            <span className="flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-vn-green animate-pulse" />
              <span className="data-readout text-[9px] text-vn-green">
                {live.length} LIVE
              </span>
            </span>
          )}
        </div>

        {/* View tabs */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`data-readout text-[9px] px-2.5 py-1 rounded-sm border transition-all ${
                view === t.id
                  ? "border-vn-cyan bg-vn-cyan/10 text-vn-cyan"
                  : "border-vn-border text-vn-text-dim hover:border-vn-cyan/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="divide-y divide-vn-border/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="w-10 h-3 bg-vn-border/40 rounded animate-pulse" />
              <div className="flex-1 h-3 bg-vn-border/40 rounded animate-pulse" />
              <div className="w-14 h-3 bg-vn-border/40 rounded animate-pulse" />
              <div className="flex-1 h-3 bg-vn-border/40 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : !hasContent ? (
        <p className="data-readout text-vn-text-dim text-[10px] text-center py-8">
          NO EVENTS AVAILABLE
        </p>
      ) : (
        <div>
          {/* LIVE NOW */}
          {live.length > 0 && (
            <>
              <SectionHeader title="LIVE NOW" accent="green" />
              {live.map((e) => renderRow(e))}
            </>
          )}

          {/* UPCOMING */}
          {upcoming.length > 0 && (
            <>
              <SectionHeader title="UPCOMING" />
              {groupByDate(upcoming).map(([dateStr, evs]) => (
                <div key={dateStr}>
                  <DateBand label={dateStr} />
                  {evs.map((e) => renderRow(e))}
                </div>
              ))}
            </>
          )}

          {/* RESULTS */}
          {results.length > 0 && (
            <>
              <SectionHeader title={isHistorical ? `RESULTS · ${view.toUpperCase()}` : "RESULTS"} />
              {groupByDate(results).map(([dateStr, evs]) => (
                <div key={dateStr}>
                  <DateBand label={dateStr} />
                  {evs.map((e) => renderRow(e))}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Decide which row component to use per event
function renderRow(e: ScoreEvent) {
  // Combat sport: has homeRecord or awayRecord set by normalizeMMA
  if (e.homeRecord !== undefined || e.awayRecord !== undefined) {
    return <BoutRow key={e.id} event={e} />;
  }
  // Team sport (has homeTeam)
  if (e.homeTeam) {
    return <MatchRow key={e.id} event={e} />;
  }
  // Ranking / leaderboard sport
  return <IndividualEventRow key={e.id} event={e} />;
}

// ── Section chrome ──────────────────────────────────────────────────────────

function SectionHeader({ title, accent }: { title: string; accent?: "green" }) {
  return (
    <div
      className={`px-4 py-1.5 border-y border-vn-border/50 ${
        accent === "green" ? "bg-vn-green/5" : "bg-vn-bg/30"
      }`}
    >
      <span
        className={`data-readout text-[9px] tracking-widest ${
          accent === "green" ? "text-vn-green" : "text-vn-orange"
        }`}
      >
        {title}
      </span>
    </div>
  );
}

function DateBand({ label }: { label: string }) {
  return (
    <div className="px-4 py-1 border-b border-vn-border/20 bg-vn-bg/20">
      <span className="data-readout text-[9px] text-vn-text-dim tracking-widest">
        {label}
      </span>
    </div>
  );
}

// ── Team match row (football, rugby, tennis etc.) ──────────────────────────

function MatchRow({ event }: { event: ScoreEvent }) {
  const isPre  = event.status === "pre";
  const isPost = event.status === "post";

  return (
    <div className="flex items-center px-4 py-3 border-b border-vn-border/30 hover:bg-white/[0.02] transition-colors">

      {/* Status / time */}
      <div className="w-14 flex-shrink-0 flex flex-col gap-0.5">
        {event.isLive ? (
          <>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-vn-green animate-pulse flex-shrink-0" />
              <span className="data-readout text-[9px] text-vn-green">LIVE</span>
            </span>
            <span className="data-readout text-[8px] text-vn-text-dim leading-none">
              {event.statusText}
            </span>
          </>
        ) : (
          <>
            <span className="data-readout text-[10px] text-vn-text-dim leading-none">
              {formatTime(event.date)}
            </span>
            {isPost && (
              <span className="data-readout text-[8px] text-vn-text-dim leading-none">FT</span>
            )}
          </>
        )}
      </div>

      {/* Home team — right-aligned */}
      <div className="flex-1 flex flex-col items-end pr-3 min-w-0">
        <span
          className={`font-mono text-[13px] leading-tight truncate max-w-full ${
            isPost
              ? event.homeWinner ? "text-vn-text font-bold" : "text-vn-text-dim"
              : "text-vn-text"
          }`}
        >
          {event.homeTeam}
        </span>
        <span className="data-readout text-[9px] text-vn-text-dim/50 leading-none">
          {event.homeAbbrev}
        </span>
      </div>

      {/* Score / vs */}
      <div className="w-20 flex-shrink-0 flex flex-col items-center gap-0.5">
        {isPre ? (
          <>
            <span className="data-readout text-[11px] text-vn-text-dim">vs</span>
            <span className="data-readout text-[8px] text-vn-text-dim/60">
              {formatShortDate(event.date)}
            </span>
          </>
        ) : (
          <span
            className={`font-mono text-base font-bold tabular-nums leading-none ${
              event.isLive ? "text-vn-green" : "text-vn-cyan"
            }`}
          >
            {event.homeScore} – {event.awayScore}
          </span>
        )}
      </div>

      {/* Away team — left-aligned */}
      <div className="flex-1 flex flex-col items-start pl-3 min-w-0">
        <span
          className={`font-mono text-[13px] leading-tight truncate max-w-full ${
            isPost
              ? event.awayWinner ? "text-vn-text font-bold" : "text-vn-text-dim"
              : "text-vn-text"
          }`}
        >
          {event.awayTeam}
        </span>
        <span className="data-readout text-[9px] text-vn-text-dim/50 leading-none">
          {event.awayAbbrev}
        </span>
      </div>
    </div>
  );
}

// ── Combat sport bout row (UFC / Boxing) ───────────────────────────────────
// Shows weight class header + both fighters with records side-by-side.

function BoutRow({ event }: { event: ScoreEvent }) {
  const isPre  = event.status === "pre";
  const isPost = event.status === "post";

  return (
    <div className="px-4 py-3 border-b border-vn-border/30 hover:bg-white/[0.02] transition-colors">

      {/* Weight class + status */}
      <div className="flex items-center justify-between mb-2">
        <span className="data-readout text-[9px] text-vn-orange tracking-widest">
          {event.name ? event.name.toUpperCase() : "BOUT"}
        </span>
        <span
          className={`data-readout text-[9px] ${
            event.isLive ? "text-vn-green" : isPost ? "text-vn-text-dim" : "text-vn-cyan"
          }`}
        >
          {event.isLive
            ? `● LIVE${event.statusText ? ` · ${event.statusText}` : ""}`
            : isPost
              ? "FINAL"
              : formatTime(event.date)}
        </span>
      </div>

      {/* Fighters */}
      <div className="flex items-center gap-2">

        {/* Home fighter */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-mono text-[13px] leading-tight truncate ${
              isPost
                ? event.homeWinner ? "text-vn-text font-bold" : "text-vn-text-dim"
                : "text-vn-text"
            }`}
          >
            {event.homeTeam}
          </p>
          {event.homeRecord && (
            <p className="data-readout text-[9px] text-vn-text-dim/60 leading-none">
              {event.homeRecord}
            </p>
          )}
        </div>

        {/* Centre: vs / result */}
        <div className="flex-shrink-0 w-10 flex flex-col items-center">
          {isPre ? (
            <span className="data-readout text-[10px] text-vn-text-dim">vs</span>
          ) : (
            <>
              {event.homeWinner && (
                <span className="data-readout text-[8px] text-vn-green">← WIN</span>
              )}
              {event.awayWinner && (
                <span className="data-readout text-[8px] text-vn-green">WIN →</span>
              )}
              {!event.homeWinner && !event.awayWinner && (
                <span className="data-readout text-[8px] text-vn-text-dim">—</span>
              )}
            </>
          )}
        </div>

        {/* Away fighter */}
        <div className="flex-1 min-w-0 text-right">
          <p
            className={`font-mono text-[13px] leading-tight truncate ${
              isPost
                ? event.awayWinner ? "text-vn-text font-bold" : "text-vn-text-dim"
                : "text-vn-text"
            }`}
          >
            {event.awayTeam}
          </p>
          {event.awayRecord && (
            <p className="data-readout text-[9px] text-vn-text-dim/60 leading-none">
              {event.awayRecord}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard / ranking row (Golf, Tennis) ───────────────────────────────

function IndividualEventRow({ event }: { event: ScoreEvent }) {
  return (
    <div className="px-4 py-3 border-b border-vn-border/30 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-mono text-[12px] text-vn-text leading-tight flex-1">
          {event.name}
        </span>
        <span
          className={`data-readout text-[9px] flex-shrink-0 ${
            event.isLive
              ? "text-vn-green"
              : event.status === "post"
                ? "text-vn-text-dim"
                : "text-vn-cyan"
          }`}
        >
          {event.isLive
            ? `LIVE · ${event.statusText}`
            : event.status === "post"
              ? "FINAL"
              : formatTime(event.date)}
        </span>
      </div>
      <div className="space-y-1">
        {(event.results ?? []).map((r, i) => (
          <div key={r.pos} className="flex items-center gap-3">
            <span
              className={`data-readout text-[9px] w-5 text-right flex-shrink-0 ${
                i === 0 ? "text-vn-orange" : "text-vn-text-dim/60"
              }`}
            >
              {r.pos}
            </span>
            <div className="w-px h-3 bg-vn-border/50 flex-shrink-0" />
            <span
              className={`font-mono text-[12px] ${
                i === 0 ? "text-vn-text font-semibold" : "text-vn-text-dim"
              }`}
            >
              {r.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Utilities ───────────────────────────────────────────────────────────────

function groupByDate(events: ScoreEvent[]): [string, ScoreEvent[]][] {
  const groups = new Map<string, ScoreEvent[]>();
  for (const ev of events) {
    const key = ev.date
      ? new Date(ev.date)
          .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
          .toUpperCase()
      : "TBD";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }
  return Array.from(groups.entries());
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}
