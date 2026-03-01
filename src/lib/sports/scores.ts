import type { ScoreEvent } from "@/app/api/scores/route";

export type { ScoreEvent };

export interface Sport {
  id: string;
  label: string;
  icon: string;
  /** false = no live score data source; scores panel shows an info message */
  hasLiveScores?: boolean;
}

export const SPORTS: Sport[] = [
  { id: "premier-league", label: "FOOTBALL", icon: "⚽", hasLiveScores: true  },
  { id: "rugby",          label: "RUGBY",    icon: "🏉", hasLiveScores: true  },
  { id: "golf",           label: "GOLF",     icon: "⛳", hasLiveScores: true  },
  { id: "boxing",         label: "BOXING",   icon: "🥊", hasLiveScores: true  },
  { id: "ufc",            label: "UFC",      icon: "🥋", hasLiveScores: true  },
  { id: "snooker",        label: "SNOOKER",  icon: "🎱", hasLiveScores: true  },
  { id: "darts",          label: "DARTS",    icon: "🎯", hasLiveScores: true  },
  { id: "atp",            label: "TENNIS",   icon: "🎾", hasLiveScores: true  },
];

export async function fetchScores(sportId: string, daysBack = 0): Promise<ScoreEvent[]> {
  const url = `/api/scores?sport=${sportId}${daysBack > 0 ? `&days=${daysBack}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.events ?? [];
}
