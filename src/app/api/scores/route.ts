/**
 * /api/scores — ESPN unofficial scoreboard proxy
 *
 * Uses ESPN's public (unofficial) scoreboard API — no key required.
 * Runs server-side so there are no CORS issues.
 * Cache: 5 minutes per sport+range.
 * Supports ?days=N to fetch historical results via ESPN date range params.
 */

import { NextResponse } from "next/server";

// ESPN scoreboard endpoints — unofficial but widely used, no key needed
// Sports without an ESPN feed (snooker, darts) return empty gracefully.
const ESPN_ENDPOINTS: Record<string, string> = {
  "premier-league": "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
  rugby:            "https://site.api.espn.com/apis/site/v2/sports/rugby-union/289/scoreboard",
  golf:             "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
  boxing:           "https://site.api.espn.com/apis/site/v2/sports/boxing/boxing/scoreboard",
  ufc:              "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard",
  atp:              "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard",
  wta:              "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard",
  "atp-doubles":    "https://site.api.espn.com/apis/site/v2/sports/tennis/atp-doubles/scoreboard",
  "wta-doubles":    "https://site.api.espn.com/apis/site/v2/sports/tennis/wta-doubles/scoreboard",
};

// TheSportsDB free API — sports not on ESPN (snooker, darts)
const SPORTSDB_LEAGUES: Record<string, string> = {
  snooker: "4555",   // World Snooker Tour
  darts:   "4554",   // PDC Darts
};
const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/1";

export interface ScoreEvent {
  id: string;
  name: string;       // weight class for MMA, event name for others
  date: string;
  status: "pre" | "in" | "post";
  statusText: string;
  isLive: boolean;
  // Team sports + combat sports (fighters mapped as home/away)
  homeTeam?: string;
  homeAbbrev?: string;
  homeScore?: string;
  homeRecord?: string;  // fighter record e.g. "23-9-2"
  awayTeam?: string;
  awayAbbrev?: string;
  awayScore?: string;
  awayRecord?: string;
  homeWinner?: boolean;
  awayWinner?: boolean;
  // Ranking sports (Golf leaderboard)
  results?: Array<{ pos: number; name: string }>;
  // Tennis tournaments — all individual matches inside the tournament
  matches?: Array<{
    id: string;
    round?: string;
    homeName: string;
    homeScore?: string;
    homeWinner?: boolean;
    awayName: string;
    awayScore?: string;
    awayWinner?: boolean;
    status: "pre" | "in" | "post";
    statusText?: string;
    isLive?: boolean;
  }>;
}

const cache = new Map<string, { data: ScoreEvent[]; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport    = searchParams.get("sport") ?? "";
  const daysBack = Math.max(0, parseInt(searchParams.get("days") ?? "0", 10));
  const endpoint = ESPN_ENDPOINTS[sport];

  if (!endpoint) {
    // Fall through to TheSportsDB for sports not on ESPN
    const leagueId = SPORTSDB_LEAGUES[sport];
    if (!leagueId) return NextResponse.json({ events: [] });

    const cacheKey2 = `${sport}:${daysBack}`;
    const hit2 = cache.get(cacheKey2);
    if (hit2 && Date.now() - hit2.ts < TTL) {
      return NextResponse.json({ events: hit2.data }, { headers: { "X-Cache": "HIT" } });
    }

    try {
      const [pastRes, nextRes] = await Promise.all([
        fetch(`${SPORTSDB_BASE}/eventspastleague.php?id=${leagueId}`, { headers: { "User-Agent": "Veritas-News/1.0" } }),
        daysBack === 0
          ? fetch(`${SPORTSDB_BASE}/eventsnextleague.php?id=${leagueId}`, { headers: { "User-Agent": "Veritas-News/1.0" } })
          : Promise.resolve(null),
      ]);
      const pastData = pastRes.ok ? await pastRes.json() : {};
      const nextData = nextRes?.ok ? await nextRes.json() : {};
      const combined = [...(nextData.events ?? []), ...(pastData.events ?? [])];
      const events   = normalizeSportsDB(combined);
      cache.set(cacheKey2, { data: events, ts: Date.now() });
      return NextResponse.json({ events });
    } catch {
      return NextResponse.json({ events: [] });
    }
  }

  // Cache key includes the date range so NOW vs LAST 7D are cached separately
  const cacheKey = `${sport}:${daysBack}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json({ events: hit.data }, { headers: { "X-Cache": "HIT" } });
  }

  const isTennis = sport === "atp" || sport === "wta" || sport === "atp-doubles" || sport === "wta-doubles";
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const now = new Date();

  // Append date range to the ESPN URL
  let url = endpoint;
  if (daysBack > 0) {
    const start = new Date(now.getTime() - daysBack * 86_400_000);
    url += `?dates=${fmt(start)}-${fmt(now)}&limit=100`;
  } else if (isTennis) {
    // Without a date ESPN returns a tournament summary with no match data.
    // Requesting today specifically returns individual match events.
    url += `?dates=${fmt(now)}&limit=100`;
  }

  // ?raw=1 bypasses normalisation — useful for inspecting the ESPN response
  const rawMode = searchParams.get("raw") === "1";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal:  controller.signal,
      headers: { "User-Agent": "Veritas-News/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // ESPN has no data for this sport/date range — return empty gracefully
      cache.set(cacheKey, { data: [], ts: Date.now() });
      return NextResponse.json({ events: [] });
    }

    const raw = await res.json();

    if (rawMode) {
      // Return raw ESPN payload (first 2 events) — for debugging only
      return NextResponse.json({
        url,
        total: raw.events?.length ?? 0,
        sample: raw.events?.slice(0, 2) ?? [],
      });
    }

    // UFC and Boxing: one ESPN "event" = one fight night with many bouts.
    // Flatten all bouts into individual rows.
    const events =
      sport === "ufc" || sport === "boxing"
        ? normalizeMMA(raw.events ?? [])
        : sport === "atp" || sport === "wta" || sport === "atp-doubles" || sport === "wta-doubles"
          ? normalizeTennis(raw.events ?? [])
          : normalizeEvents(raw.events ?? []);

    cache.set(cacheKey, { data: events, ts: Date.now() });
    return NextResponse.json({ events });
  } catch (err) {
    console.error("[/api/scores]", err);
    const stale = cache.get(cacheKey);
    if (stale) return NextResponse.json({ events: stale.data });
    return NextResponse.json({ events: [] });
  }
}

// ── Standard sports normaliser ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEvents(raw: any[]): ScoreEvent[] {
  return raw
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 16)
    .map((e) => {
    const comp  = e.competitions?.[0];
    const state = e.status?.type?.state ?? "pre";
    const statusText =
      e.status?.type?.shortDetail ??
      e.status?.type?.description ??
      "";

    const competitors: any[] = comp?.competitors ?? [];

    // Individual ranking sport (Golf leaderboard, Tennis order-of-play)
    // These have `athlete` but no `homeAway` field.
    if (competitors[0]?.athlete && !competitors[0]?.homeAway) {
      return {
        id:         e.id ?? crypto.randomUUID(),
        name:       e.name ?? "",
        date:       e.date ?? "",
        status:     state as ScoreEvent["status"],
        statusText,
        isLive:     state === "in",
        results:    competitors
          .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
          .slice(0, 32)
          .map((c) => ({ pos: c.order ?? 0, name: c.athlete?.displayName ?? "" })),
      };
    }

    // Team sport
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");

    return {
      id:         e.id ?? crypto.randomUUID(),
      name:       e.name ?? "",
      date:       e.date ?? "",
      status:     state as ScoreEvent["status"],
      statusText,
      isLive:     state === "in",
      homeTeam:   home?.team?.shortDisplayName ?? home?.team?.displayName ?? "",
      homeAbbrev: home?.team?.abbreviation ?? "",
      homeScore:  home?.score ?? "0",
      awayTeam:   away?.team?.shortDisplayName ?? away?.team?.displayName ?? "",
      awayAbbrev: away?.team?.abbreviation ?? "",
      awayScore:  away?.score ?? "0",
      homeWinner: home?.winner,
      awayWinner: away?.winner,
    };
  });
}

// ── MMA / Boxing normaliser ────────────────────────────────────────────────
// A UFC/Boxing ESPN event is a single fight night.
// Its `competitions` array contains each individual bout.
// We flatten those into separate ScoreEvent rows.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMMA(rawEvents: any[]): ScoreEvent[] {
  const bouts: ScoreEvent[] = [];

  for (const event of rawEvents
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 5)) {
    const eventDate  = event.date ?? "";
    const eventState = event.status?.type?.state ?? "pre";

    for (const comp of event.competitions ?? []) {
      const competitors: any[] = comp.competitors ?? [];
      if (competitors.length < 2) continue;

      const home = competitors.find((c: any) => c.homeAway === "home") ?? competitors[0];
      const away = competitors.find((c: any) => c.homeAway === "away") ?? competitors[1];

      const compState  = comp.status?.type?.state ?? eventState;
      const isComplete = compState === "post";

      // Weight class comes from comp.type.text (e.g. "Flyweight")
      const boutName =
        comp.type?.text ??
        comp.type?.name ??
        "";

      bouts.push({
        id:         comp.id ?? crypto.randomUUID(),
        name:       boutName,
        date:       comp.date ?? eventDate,
        status:     compState as ScoreEvent["status"],
        statusText: comp.status?.type?.shortDetail ?? "",
        isLive:     compState === "in",
        homeTeam:   home?.athlete?.displayName ?? home?.athlete?.shortName ?? "",
        homeAbbrev: home?.athlete?.shortName ?? "",
        homeScore:  isComplete ? (home?.winner ? "W" : "L") : "",
        homeRecord: home?.records?.[0]?.displayValue ?? home?.athlete?.record ?? "",
        homeWinner: home?.winner ?? false,
        awayTeam:   away?.athlete?.displayName ?? away?.athlete?.shortName ?? "",
        awayAbbrev: away?.athlete?.shortName ?? "",
        awayScore:  isComplete ? (away?.winner ? "W" : "L") : "",
        awayRecord: away?.records?.[0]?.displayValue ?? away?.athlete?.record ?? "",
        awayWinner: away?.winner ?? false,
      });
    }
  }

  return bouts.slice(0, 30);
}

// ── Tennis normaliser ─────────────────────────────────────────────────────
// ESPN tennis: each event = a tournament; competitions[] = individual matches.
// We collect all matches into the `matches` field for drill-down in the UI.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTennisName(c: any): string {
  return (
    c?.athlete?.displayName ??
    c?.athlete?.fullName ??
    c?.athlete?.shortName ??
    c?.team?.displayName ??
    c?.team?.shortName ??
    c?.displayName ??
    c?.shortName ??
    ""
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTennis(rawEvents: any[]): ScoreEvent[] {
  const sorted = rawEvents
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  // Debug: log the structure of the first event to the server console
  if (sorted.length > 0) {
    const s = sorted[0];
    console.log(
      `[tennis] ${sorted.length} events | first="${s.name}" comps=${s.competitions?.length ?? 0}` +
      (s.competitions?.[0] ? ` | comp0 competitors=${s.competitions[0].competitors?.length ?? 0}` : "") +
      (s.competitors ? ` | event-level competitors=${s.competitors.length}` : ""),
    );
  }

  // Detect whether ESPN returned individual match events (each event = one match)
  // vs tournament events (each event = a tournament with many competitions).
  // Heuristic: if the majority of events have ≤ 2 competitions each, treat as match events.
  const avgComps = sorted.length > 0
    ? sorted.slice(0, 5).reduce((sum, e) => sum + (e.competitions?.length ?? 0), 0) / Math.min(5, sorted.length)
    : 0;
  const isMatchEvents = avgComps <= 2;

  if (isMatchEvents) {
    // Each ESPN event = one individual match — render directly as MatchRow entries.
    // Group by tournament name so we can bucket them under a TournamentRow.
    const grouped = new Map<string, { name: string; date: string; events: any[] }>();
    for (const e of sorted) {
      // Try several fields for the tournament name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tourneyName: string =
        (e as any).season?.displayName ??
        (e as any).season?.name ??
        (e as any).tournament?.displayName ??
        (e as any).tournament?.name ??
        e.name ??
        "Tournament";
      if (!grouped.has(tourneyName)) grouped.set(tourneyName, { name: tourneyName, date: e.date ?? "", events: [] });
      grouped.get(tourneyName)!.events.push(e);
    }

    return Array.from(grouped.values())
      .slice(0, 6)
      .map(({ name, date, events: evs }) => {
        const latestState = evs[0]?.status?.type?.state ?? "pre";
        const statusText  = evs[0]?.status?.type?.shortDetail ?? evs[0]?.status?.type?.description ?? "";
        const isLive      = evs.some((e: any) => e.status?.type?.state === "in");
        const aggState    = isLive ? "in" : latestState;

        const matches = evs.flatMap((e: any): NonNullable<ScoreEvent["matches"]>[number][] => {
          // Players may be in competitions[0].competitors or directly in e.competitors
          const comp = e.competitions?.[0];
          const competitors: any[] = comp?.competitors ?? e.competitors ?? [];
          if (competitors.length < 2) return [];
          const home = competitors.find((c: any) => c.homeAway === "home") ?? competitors[0];
          const away = competitors.find((c: any) => c.homeAway === "away") ?? competitors[1];
          const homeName = getTennisName(home);
          const awayName = getTennisName(away);
          if (!homeName && !awayName) return [];
          const compState = comp?.status?.type?.state ?? e.status?.type?.state ?? "pre";
          const hasScores = compState === "in" || compState === "post";
          return [{
            id:         e.id ?? comp?.id ?? crypto.randomUUID(),
            round:      comp?.type?.text ?? comp?.type?.abbreviation ?? e.type?.text ?? "",
            homeName,
            homeScore:  hasScores ? (home.score ?? "") : "",
            homeWinner: home.winner ?? false,
            awayName,
            awayScore:  hasScores ? (away.score ?? "") : "",
            awayWinner: away.winner ?? false,
            status:     compState as "pre" | "in" | "post",
            statusText: comp?.status?.type?.shortDetail ?? "",
            isLive:     compState === "in",
          }];
        });

        return {
          id:         name + "-" + (evs[0]?.id ?? "t"),
          name,
          date,
          status:     aggState as ScoreEvent["status"],
          statusText,
          isLive,
          matches:    matches.length > 0 ? matches : undefined,
        };
      });
  }

  // Tournament events: each ESPN event = a tournament; competitions[] = individual matches.
  return sorted
    .slice(0, 12)
    .map((e) => {
      const state      = e.status?.type?.state ?? "pre";
      const statusText = e.status?.type?.shortDetail ?? e.status?.type?.description ?? "";
      const competitions: any[] = e.competitions ?? [];

      const matches = competitions.flatMap((comp: any): NonNullable<ScoreEvent["matches"]>[number][] => {
        const competitors: any[] = comp.competitors ?? [];
        if (competitors.length < 2) return [];
        const home = competitors.find((c: any) => c.homeAway === "home") ?? competitors[0];
        const away = competitors.find((c: any) => c.homeAway === "away") ?? competitors[1];
        const homeName = getTennisName(home);
        const awayName = getTennisName(away);
        if (!homeName && !awayName) return [];
        const compState = comp.status?.type?.state ?? state;
        const hasScores = compState === "in" || compState === "post";
        return [{
          id:         comp.id ?? crypto.randomUUID(),
          round:      comp.type?.text ?? comp.type?.abbreviation ?? comp.type?.name ?? "",
          homeName,
          homeScore:  hasScores ? (home.score ?? "") : "",
          homeWinner: home.winner ?? false,
          awayName,
          awayScore:  hasScores ? (away.score ?? "") : "",
          awayWinner: away.winner ?? false,
          status:     compState as "pre" | "in" | "post",
          statusText: comp.status?.type?.shortDetail ?? "",
          isLive:     compState === "in",
        }];
      });

      // Fallback: try event-level competitors if competitions yielded nothing
      const evComps: any[] = e.competitors ?? [];
      if (matches.length === 0 && evComps.length >= 2) {
        const h = evComps.find((c: any) => c.homeAway === "home") ?? evComps[0];
        const a = evComps.find((c: any) => c.homeAway === "away") ?? evComps[1];
        const hName = getTennisName(h);
        const aName = getTennisName(a);
        if (hName || aName) {
          const hasScores = state === "in" || state === "post";
          return {
            id:         e.id ?? crypto.randomUUID(),
            name:       e.name ?? "",
            date:       e.date ?? "",
            status:     state as ScoreEvent["status"],
            statusText,
            isLive:     state === "in",
            homeTeam:   hName,
            homeAbbrev: h?.athlete?.shortName ?? hName.split(" ").pop() ?? "",
            homeScore:  hasScores ? (h?.score ?? "") : "",
            homeWinner: h?.winner ?? false,
            awayTeam:   aName,
            awayAbbrev: a?.athlete?.shortName ?? aName.split(" ").pop() ?? "",
            awayScore:  hasScores ? (a?.score ?? "") : "",
            awayWinner: a?.winner ?? false,
          };
        }
      }

      return {
        id:         e.id ?? crypto.randomUUID(),
        name:       e.name ?? "",
        date:       e.date ?? "",
        status:     state as ScoreEvent["status"],
        statusText,
        isLive:     state === "in",
        matches:    matches.length > 0 ? matches : undefined,
      };
    });
}

// ── TheSportsDB normaliser ─────────────────────────────────────────────────
// Used for sports not on ESPN (snooker, darts).
// Fields: strHomeTeam, strAwayTeam, intHomeScore, intAwayScore,
//         dateEvent, strStatus, idEvent, strEvent.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSportsDB(raw: any[]): ScoreEvent[] {
  return raw
    .filter((e) => e.strHomeTeam && e.strAwayTeam)
    .map((e) => {
      const hScore   = e.intHomeScore?.toString() ?? "";
      const aScore   = e.intAwayScore?.toString() ?? "";
      const finished = e.strStatus === "Match Finished" ||
                       (e.intHomeScore !== null && e.intHomeScore !== "" && e.intHomeScore !== undefined);
      const pre      = !finished && e.strStatus === "Not Started";
      const status   = finished ? "post" : pre ? "pre" : "in";
      return {
        id:         e.idEvent   ?? crypto.randomUUID(),
        name:       e.strEvent  ?? "",
        date:       e.dateEvent ?? "",
        status:     status as ScoreEvent["status"],
        statusText: e.strStatus ?? "",
        isLive:     status === "in",
        homeTeam:   e.strHomeTeam ?? "",
        homeAbbrev: (e.strHomeTeam as string)?.split(" ").pop() ?? "",
        homeScore:  hScore,
        awayTeam:   e.strAwayTeam ?? "",
        awayAbbrev: (e.strAwayTeam as string)?.split(" ").pop() ?? "",
        awayScore:  aScore,
        homeWinner: finished && hScore !== "" && aScore !== "" &&
                    parseInt(hScore) > parseInt(aScore),
        awayWinner: finished && hScore !== "" && aScore !== "" &&
                    parseInt(aScore) > parseInt(hScore),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);
}
