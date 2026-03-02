import { wmoDesc } from "./wmo";

interface HourlySlice {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  weathercode: number[];
}

function fmt12(h: number): string {
  if (h === 0) return "midnight";
  if (h < 12) return `${h}am`;
  if (h === 12) return "noon";
  return `${h - 12}pm`;
}

export function buildDaySummary(hourly: HourlySlice, currentTemp: number): string {
  // Open-Meteo returns hourly for all 7 days; we only want today (first 24 entries)
  const todayCount = Math.min(hourly.time.length, 24);
  const probs = hourly.precipitation_probability.slice(0, todayCount);
  const codes = hourly.weathercode.slice(0, todayCount);

  // Find rain hours (precip probability > 50%) and group consecutive hours into ranges
  const rainHours: number[] = [];
  probs.forEach((p, i) => { if (p > 50) rainHours.push(i); });

  const blocks: string[] = [];
  if (rainHours.length > 0) {
    let start = rainHours[0];
    let prev = rainHours[0];
    for (let i = 1; i <= rainHours.length; i++) {
      if (i === rainHours.length || rainHours[i] !== prev + 1) {
        blocks.push(start === prev ? fmt12(start) : `${fmt12(start)}–${fmt12(prev + 1)}`);
        if (i < rainHours.length) start = rainHours[i];
      }
      prev = rainHours[i];
    }
  }

  // Dominant weathercode across today
  const codeFreq: Record<number, number> = {};
  codes.forEach((c) => { codeFreq[c] = (codeFreq[c] ?? 0) + 1; });
  const dominantCode = Number(
    Object.entries(codeFreq).sort((a, b) => b[1] - a[1])[0][0]
  );
  const condition = wmoDesc(dominantCode).toLowerCase();

  const temp = `${Math.round(currentTemp)}°C`;

  if (blocks.length === 0) {
    return `${temp}, ${condition} throughout the day`;
  }

  const rainDesc =
    rainHours.length > 16
      ? "rain throughout most of the day"
      : `rain between ${blocks.join(" and ")}`;

  return `${temp}, ${rainDesc}`;
}
