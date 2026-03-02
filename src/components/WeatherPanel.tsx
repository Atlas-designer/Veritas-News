"use client";

import { useState, useCallback } from "react";
import HudFrame from "@/components/ui/HudFrame";
import {
  getWeatherPrefs,
  setWeatherPrefs,
  WeatherLocation,
} from "@/lib/weather/prefs";
import { useWeather, DayForecast } from "@/hooks/useWeather";

function dayLabel(dateStr: string, i: number): string {
  if (i === 0) return "TODAY";
  if (i === 1) return "TOMORROW";
  return new Date(dateStr + "T00:00:00")
    .toLocaleDateString("en-GB", { weekday: "short" })
    .toUpperCase();
}

function bestDay(
  forecast: DayForecast[],
  prefer: "outside" | "bed"
): DayForecast | null {
  if (!forecast.length) return null;
  return [...forecast].sort((a, b) =>
    prefer === "outside"
      ? a.precipProbMax - b.precipProbMax || b.tempMax - a.tempMax
      : b.precipProbMax - a.precipProbMax || a.tempMax - b.tempMax
  )[0];
}

export default function WeatherPanel() {
  const [prefs, setPrefsState] = useState(() => getWeatherPrefs());
  const [postcode, setPostcode] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState(false);
  const [funResult, setFunResult] = useState<{
    type: string;
    day: DayForecast;
  } | null>(null);

  const weather = useWeather();

  const applyLocation = useCallback(
    (loc: WeatherLocation) => {
      const next = { ...prefs, location: loc };
      setWeatherPrefs(next);
      setPrefsState(next);
      // Clear session cache so useWeather re-fetches on next render
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

  // No location set — show setup prompt
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
      {/* Current conditions */}
      <HudFrame
        title={`⛅ WEATHER — ${prefs.location.name.toUpperCase()}`}
        className="mb-0"
      >
        {weather.currentTemp !== null ? (
          <div className="flex items-center gap-4">
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
        ) : (
          <p className="text-xs text-vn-text-dim">
            Unable to load weather data.
          </p>
        )}
      </HudFrame>

      {/* 7-day forecast */}
      {weather.forecast.length > 0 && (
        <HudFrame title="7-DAY FORECAST" className="mb-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {weather.forecast.map((day, i) => (
              <div
                key={day.date}
                className="flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-sm border border-vn-border bg-vn-bg/40 min-w-[68px]"
              >
                <div className="data-readout text-[9px] text-vn-text-dim">
                  {dayLabel(day.date, i)}
                </div>
                <div className="text-2xl leading-none my-1">{day.icon}</div>
                <div className="font-mono text-xs text-vn-text font-bold">
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
              </div>
            ))}
          </div>
        </HudFrame>
      )}

      {/* Fun buttons */}
      {weather.forecast.length > 0 && (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const day = bestDay(weather.forecast, "outside");
                if (day) setFunResult({ type: "outside", day });
              }}
              className="flex-1 py-2 px-3 border border-vn-border rounded-sm text-[10px] font-mono text-vn-text-dim hover:border-vn-cyan/40 hover:text-vn-cyan transition-all"
            >
              ☀️ BEST DAY OUTSIDE
            </button>
            <button
              onClick={() => {
                const day = bestDay(weather.forecast, "bed");
                if (day) setFunResult({ type: "bed", day });
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
                  )} looks best — ${funResult.day.tempMax}°C with only ${funResult.day.precipProbMax}% chance of rain`
                : `🛏 ${new Date(funResult.day.date + "T00:00:00").toLocaleDateString(
                    "en-GB",
                    { weekday: "long" }
                  )} is a write-off — ${funResult.day.tempMax}°C with ${funResult.day.precipProbMax}% chance of rain`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
