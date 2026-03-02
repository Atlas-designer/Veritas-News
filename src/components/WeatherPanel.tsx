"use client";

import { useState, useCallback } from "react";
import HudFrame from "@/components/ui/HudFrame";
import {
  getWeatherPrefs,
  setWeatherPrefs,
  WeatherLocation,
} from "@/lib/weather/prefs";
import { useWeather, DayForecast, HourlyData } from "@/hooks/useWeather";

// ── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(dateStr: string, i: number): string {
  if (i === 0) return "TODAY";
  if (i === 1) return "TOMORROW";
  return new Date(dateStr + "T00:00:00")
    .toLocaleDateString("en-GB", { weekday: "short" })
    .toUpperCase();
}


// Only consider 08:00–20:00 for day quality — night weather is irrelevant
const DAYTIME_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function daytimeStats(hourly: HourlyData, dayIndex: number) {
  const temps  = DAYTIME_HOURS.map((h) => hourly.temp[dayIndex * 24 + h] ?? 0);
  const probs  = DAYTIME_HOURS.map((h) => hourly.precipProb[dayIndex * 24 + h] ?? 0);
  return {
    tempMax:    Math.max(...temps),
    precipMax:  Math.max(...probs),
  };
}

function bestDay(
  forecast: DayForecast[],
  hourly: HourlyData,
  prefer: "outside" | "bed"
): { day: DayForecast; daytimePrecip: number; daytimeTemp: number } | null {
  if (!forecast.length) return null;
  const withStats = forecast.map((day, i) => ({ day, ...daytimeStats(hourly, i) }));
  const best = [...withStats].sort((a, b) =>
    prefer === "outside"
      ? a.precipMax - b.precipMax || b.tempMax - a.tempMax
      : b.precipMax - a.precipMax || a.tempMax - b.tempMax
  )[0];
  return { day: best.day, daytimePrecip: best.precipMax, daytimeTemp: best.tempMax };
}

// ── Hourly breakdown ──────────────────────────────────────────────────────────

const AM_HOURS = [0, 2, 4, 6, 8, 10];      // 00:00 – 10:00  (left column)
const PM_HOURS = [12, 14, 16, 18, 20, 22];  // 12:00 – 22:00  (right column)

function HourRow({
  h, idx, isPast, hourly,
}: {
  h: number; idx: number; isPast: boolean; hourly: HourlyData;
}) {
  return (
    <div className={`flex items-center gap-2 py-1 px-1 ${isPast ? "opacity-35" : ""}`}>
      <span className="font-mono text-[10px] text-vn-text-dim w-10 flex-shrink-0">
        {String(h).padStart(2, "0")}:00
      </span>
      <span className="text-sm leading-none flex-shrink-0">
        {hourly.icon[idx] ?? "—"}
      </span>
      <span className="font-mono text-[11px] text-vn-text font-bold flex-shrink-0 w-7">
        {hourly.temp[idx] !== undefined ? `${hourly.temp[idx]}°` : "—"}
      </span>
      {(hourly.precipProb[idx] ?? 0) > 5 && (
        <span className="font-mono text-[9px] text-blue-400 flex-shrink-0">
          💧{hourly.precipProb[idx]}%
        </span>
      )}
    </div>
  );
}

function HourlyBreakdown({
  hourly,
  dayIndex,
}: {
  hourly: HourlyData;
  dayIndex: number;
}) {
  const nowHour = new Date().getHours();

  return (
    <div className="mt-2 border-t border-vn-border/30 pt-2 flex gap-2">
      {/* AM column — 00:00 to 10:00 */}
      <div className="flex-1 border-r border-vn-border/20 pr-2">
        <div className="data-readout text-[8px] text-vn-text-dim tracking-widest mb-1 px-1">AM</div>
        {AM_HOURS.map((h) => (
          <HourRow
            key={h}
            h={h}
            idx={dayIndex * 24 + h}
            isPast={dayIndex === 0 && h < nowHour}
            hourly={hourly}
          />
        ))}
      </div>
      {/* PM column — 12:00 to 22:00 */}
      <div className="flex-1 pl-1">
        <div className="data-readout text-[8px] text-vn-text-dim tracking-widest mb-1 px-1">PM</div>
        {PM_HOURS.map((h) => (
          <HourRow
            key={h}
            h={h}
            idx={dayIndex * 24 + h}
            isPast={dayIndex === 0 && h < nowHour}
            hourly={hourly}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WeatherPanel() {
  const [prefs, setPrefsState] = useState(() => getWeatherPrefs());
  const [postcode, setPostcode] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState(false);
  const [funResult, setFunResult] = useState<{
    type: string;
    day: DayForecast;
    daytimePrecip: number;
    daytimeTemp: number;
  } | null>(null);
  // null = none open; 0–6 = that day's hourly is expanded
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const weather = useWeather();

  const applyLocation = useCallback(
    (loc: WeatherLocation) => {
      const next = { ...prefs, location: loc };
      setWeatherPrefs(next);
      setPrefsState(next);
      try { sessionStorage.removeItem("vn:weather:data"); } catch {}
      window.location.reload();
    },
    [prefs]
  );

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        applyLocation({
          lat: coords.latitude,
          lon: coords.longitude,
          name: "My Location",
        });
      },
      () => setGeoLoading(false)
    );
  };

  const handlePostcode = async () => {
    setPostcodeError(false);
    if (!postcode.trim()) return;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          postcode.trim()
        )}&count=1&language=en&format=json`
      );
      const json = await res.json();
      const r = json.results?.[0];
      if (!r) { setPostcodeError(true); return; }
      applyLocation({ lat: r.latitude, lon: r.longitude, name: r.name });
    } catch {
      setPostcodeError(true);
    }
  };

  // ── No location — setup prompt ──────────────────────────────────────────────
  if (!prefs.location) {
    return (
      <HudFrame title="⛅ WEATHER" className="mb-4">
        <p className="text-xs text-vn-text-dim mb-4">
          Set your location to see local weather forecasts.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="data-readout text-[10px] px-4 py-2 border border-vn-cyan/50 text-vn-cyan rounded-sm hover:bg-vn-cyan/10 transition-all disabled:opacity-50"
          >
            {geoLoading ? "DETECTING..." : "📍 USE MY LOCATION"}
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              value={postcode}
              onChange={(e) => { setPostcode(e.target.value); setPostcodeError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handlePostcode()}
              placeholder="Postcode or city (e.g. SW1A, London)..."
              className={`flex-1 bg-vn-panel border rounded-sm px-3 py-2 font-mono text-xs text-vn-text placeholder-vn-text-dim/50 focus:outline-none transition-colors ${
                postcodeError
                  ? "border-vn-red/60 focus:border-vn-red"
                  : "border-vn-border focus:border-vn-cyan/60"
              }`}
            />
            <button
              onClick={handlePostcode}
              className="data-readout text-[10px] px-3 py-2 border border-vn-border text-vn-text-dim rounded-sm hover:border-vn-cyan/40 hover:text-vn-cyan transition-all"
            >
              SEARCH
            </button>
          </div>
          {postcodeError && (
            <p className="text-[10px] font-mono text-vn-red">
              Location not found — try a different postcode or city name.
            </p>
          )}
          <p className="text-[10px] text-vn-text-dim">
            You can also set your location in{" "}
            <span className="text-vn-cyan">Settings → Weather</span>.
          </p>
        </div>
      </HudFrame>
    );
  }

  if (weather.loading) {
    return (
      <div className="text-vn-text-dim text-xs font-mono py-8 text-center tracking-widest">
        LOADING WEATHER...
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Current conditions + today's hourly */}
      <HudFrame
        title={`⛅ WEATHER — ${prefs.location.name.toUpperCase()}`}
        className="mb-0"
      >
        {weather.currentTemp !== null ? (
          <>
            <div className="flex items-center gap-4 mb-1">
              <span className="text-5xl leading-none">{weather.currentIcon}</span>
              <div>
                <div className="font-mono text-3xl font-bold text-vn-text">
                  {weather.currentTemp}°C
                </div>
                {weather.daySummary && (
                  <div className="text-xs text-vn-text-dim mt-1">
                    {weather.daySummary.replace(/^\d+°C,\s*/, "")}
                  </div>
                )}
              </div>
            </div>
            {/* Today's hourly — always visible */}
            {weather.hourly && (
              <HourlyBreakdown hourly={weather.hourly} dayIndex={0} />
            )}
          </>
        ) : (
          <p className="text-xs text-vn-text-dim">Unable to load weather data.</p>
        )}
      </HudFrame>

      {/* 7-day forecast — clickable for hourly dropdown */}
      {weather.forecast.length > 0 && (
        <HudFrame title="7-DAY FORECAST" className="mb-0">
          {/* Scrollable day cards */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {weather.forecast.map((day, i) => {
              const isExpanded = expandedDay === i;
              return (
                <button
                  key={day.date}
                  onClick={() => setExpandedDay(isExpanded ? null : i)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-sm border transition-all min-w-[68px] ${
                    isExpanded
                      ? "border-vn-cyan bg-vn-cyan/10 text-vn-cyan"
                      : "border-vn-border bg-vn-bg/40 hover:border-vn-cyan/40"
                  }`}
                >
                  <div className={`data-readout text-[9px] ${isExpanded ? "text-vn-cyan" : "text-vn-text-dim"}`}>
                    {dayLabel(day.date, i)}
                  </div>
                  <div className="text-2xl leading-none my-1">{day.icon}</div>
                  <div className={`font-mono text-xs font-bold ${isExpanded ? "text-vn-cyan" : "text-vn-text"}`}>
                    {day.tempMax}°
                  </div>
                  <div className="font-mono text-[10px] text-vn-text-dim">
                    {day.tempMin}°
                  </div>
                  {day.precipProbMax > 20 && (
                    <div className="data-readout text-[8px] text-blue-400 mt-0.5">
                      💧{day.precipProbMax}%
                    </div>
                  )}
                  <div className={`data-readout text-[7px] mt-0.5 ${isExpanded ? "text-vn-cyan" : "text-vn-text-dim"}`}>
                    {isExpanded ? "▴" : "▾"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Hourly dropdown for selected day */}
          {expandedDay !== null && weather.hourly && (
            <div className="mt-3 border-t border-vn-border/40 pt-3">
              <div className="data-readout text-[9px] text-vn-cyan tracking-widest mb-1">
                {dayLabel(weather.forecast[expandedDay]?.date ?? "", expandedDay)} — HOURLY BREAKDOWN
              </div>
              <HourlyBreakdown hourly={weather.hourly} dayIndex={expandedDay} />
            </div>
          )}
        </HudFrame>
      )}

      {/* Fun buttons — only available once hourly data is loaded */}
      {weather.forecast.length > 0 && weather.hourly && (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const result = bestDay(weather.forecast, weather.hourly!, "outside");
                if (result) setFunResult({ type: "outside", ...result });
              }}
              className="flex-1 py-2 px-3 border border-vn-border rounded-sm text-[10px] font-mono text-vn-text-dim hover:border-vn-cyan/40 hover:text-vn-cyan transition-all"
            >
              ☀️ BEST DAY OUTSIDE
            </button>
            <button
              onClick={() => {
                const result = bestDay(weather.forecast, weather.hourly!, "bed");
                if (result) setFunResult({ type: "bed", ...result });
              }}
              className="flex-1 py-2 px-3 border border-vn-border rounded-sm text-[10px] font-mono text-vn-text-dim hover:border-vn-cyan/40 hover:text-vn-cyan transition-all"
            >
              🛏 BEST DAY IN BED
            </button>
          </div>
          {funResult && (
            <div className="px-3 py-2 border border-vn-border bg-vn-panel rounded-sm text-xs text-vn-text-dim font-mono">
              {funResult.type === "outside"
                ? `☀️ ${new Date(funResult.day.date + "T00:00:00").toLocaleDateString(
                    "en-GB",
                    { weekday: "long" }
                  )} looks best — ${funResult.daytimeTemp}°C with only ${funResult.daytimePrecip}% chance of rain (8am–8pm)`
                : `🛏 ${new Date(funResult.day.date + "T00:00:00").toLocaleDateString(
                    "en-GB",
                    { weekday: "long" }
                  )} is a write-off — ${funResult.daytimeTemp}°C with ${funResult.daytimePrecip}% chance of rain (8am–8pm)`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
