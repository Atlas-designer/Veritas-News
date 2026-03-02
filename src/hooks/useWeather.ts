"use client";

import { useEffect, useState } from "react";
import { getWeatherPrefs, WeatherLocation } from "@/lib/weather/prefs";
import { buildDaySummary } from "@/lib/weather/summary";
import { wmoIcon } from "@/lib/weather/wmo";

export interface DayForecast {
  date: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  precipSum: number;
  precipProbMax: number;
}

export interface WeatherState {
  loading: boolean;
  location: WeatherLocation | null;
  currentTemp: number | null;
  currentIcon: string | null;
  daySummary: string | null;
  forecast: DayForecast[];
}

const CACHE_KEY = "vn:weather:data";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useWeather(): WeatherState {
  const [state, setState] = useState<WeatherState>({
    loading: false,
    location: null,
    currentTemp: null,
    currentIcon: null,
    daySummary: null,
    forecast: [],
  });

  useEffect(() => {
    const prefs = getWeatherPrefs();
    if (!prefs.enabled || !prefs.location) {
      setState((s) => ({ ...s, loading: false, location: prefs.location ?? null }));
      return;
    }

    const loc = prefs.location;
    setState((s) => ({ ...s, loading: true, location: loc }));

    // Check session cache
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setState({ ...data, loading: false, location: loc });
          return;
        }
      }
    } catch {}

    // Fetch from Open-Meteo
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&current_weather=true` +
      `&hourly=temperature_2m,precipitation_probability,weathercode` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode` +
      `&timezone=auto&forecast_days=7`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        const cw = json.current_weather;
        const d = json.daily;

        const forecast: DayForecast[] = (d.time ?? []).map(
          (date: string, i: number) => ({
            date,
            icon: wmoIcon(d.weathercode[i]),
            tempMax: Math.round(d.temperature_2m_max[i]),
            tempMin: Math.round(d.temperature_2m_min[i]),
            precipSum: Math.round(d.precipitation_sum[i] * 10) / 10,
            precipProbMax: d.precipitation_probability_max[i],
          })
        );

        const daySummary = buildDaySummary(json.hourly, cw.temperature);

        const data: WeatherState = {
          loading: false,
          location: loc,
          currentTemp: Math.round(cw.temperature),
          currentIcon: wmoIcon(cw.weathercode),
          daySummary,
          forecast,
        };

        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data, ts: Date.now() })
          );
        } catch {}

        setState(data);
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  return state;
}
