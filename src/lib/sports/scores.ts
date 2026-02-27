import type { ScoreEvent } from "@/app/api/scores/route";

export type { ScoreEvent };

export interface Sport {
  id: string;
  label: string;
  icon: string;
}

export const SPORTS: Sport[] = [
  { id: "premier-league", label: "FOOTBALL", icon: "⚽" },
  { id: "rugby",          label: "RUGBY",    icon: "🏉" },
  { id: "golf",           label: "GOLF",     icon: "⛳" },
  { id: "boxing",         label: "BOXING",   icon: "🥊" },
  { id: "ufc",            label: "UFC",      icon: "🥋" },
  { id: "snooker",        label: "SNOOKER",  icon: "🎱" },
  { id: "darts",          label: "DARTS",    icon: "🎯" },
  { id: "atp",            label: "TENNIS",   icon: "🎾" },
];

export async function fetchScores(sportId: string, daysBack = 0): Promise<ScoreEvent[]> {
  const url = `/api/scores?sport=${sportId}${daysBack > 0 ? `&days=${daysBack}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.events ?? [];
}
