const ICONS: Record<number, string> = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌦", 55: "🌦",
  61: "🌧", 63: "🌧", 65: "🌧",
  71: "🌨", 73: "🌨", 75: "🌨", 77: "🌨",
  80: "🌧", 81: "🌧", 82: "🌧",
  85: "🌨", 86: "🌨",
  95: "⛈", 96: "⛈", 99: "⛈",
};

const DESCS: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Light snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Moderate showers", 82: "Heavy showers",
  85: "Light snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
};

export const wmoIcon = (code: number): string => ICONS[code] ?? "🌡";
export const wmoDesc = (code: number): string => DESCS[code] ?? "Unknown";
