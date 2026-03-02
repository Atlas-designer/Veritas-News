const KEY = "vn:weather";

export interface WeatherLocation {
  lat: number;
  lon: number;
  name: string;
}

export interface WeatherPrefs {
  enabled: boolean;
  location: WeatherLocation | null;
}

const DEFAULTS: WeatherPrefs = { enabled: false, location: null };

export function getWeatherPrefs(): WeatherPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const s = localStorage.getItem(KEY);
    return s ? { ...DEFAULTS, ...JSON.parse(s) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setWeatherPrefs(p: WeatherPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}
