/**
 * EPIC 7.2 — Offline geo-tagging
 *
 * Compact lat/lon lookup table (~150 entries).
 * Scans article titles + cluster topics for location names.
 * No API calls — entirely local.
 */

export interface GeoLocation {
  name: string;
  lat: number;
  lon: number;
  type: "country" | "city" | "region";
}

export interface GeoTaggedCluster {
  id: string;
  topic: string;
  lat: number;
  lon: number;
  locationName: string;
}

// Priority: city (2) > region (1) > country (0)
const TYPE_PRIORITY: Record<GeoLocation["type"], number> = {
  city: 2,
  region: 1,
  country: 0,
};

// ── Lookup table ──────────────────────────────────────────────────────────────

export const LOCATIONS: GeoLocation[] = [
  // Countries — A-Z
  { name: "Afghanistan",      lat: 34.53,  lon: 69.17,   type: "country" },
  { name: "Argentina",        lat: -34.60, lon: -58.38,  type: "country" },
  { name: "Australia",        lat: -35.28, lon: 149.13,  type: "country" },
  { name: "Bangladesh",       lat: 23.72,  lon: 90.40,   type: "country" },
  { name: "Belgium",          lat: 50.85,  lon: 4.35,    type: "country" },
  { name: "Brazil",           lat: -15.78, lon: -47.93,  type: "country" },
  { name: "Canada",           lat: 45.42,  lon: -75.69,  type: "country" },
  { name: "Chile",            lat: -33.46, lon: -70.65,  type: "country" },
  { name: "China",            lat: 39.90,  lon: 116.40,  type: "country" },
  { name: "Colombia",         lat: 4.71,   lon: -74.07,  type: "country" },
  { name: "Cuba",             lat: 23.13,  lon: -82.38,  type: "country" },
  { name: "Czech Republic",   lat: 50.08,  lon: 14.43,   type: "country" },
  { name: "Egypt",            lat: 30.06,  lon: 31.25,   type: "country" },
  { name: "Ethiopia",         lat: 9.02,   lon: 38.74,   type: "country" },
  { name: "France",           lat: 48.86,  lon: 2.35,    type: "country" },
  { name: "Germany",          lat: 52.52,  lon: 13.41,   type: "country" },
  { name: "Greece",           lat: 37.98,  lon: 23.73,   type: "country" },
  { name: "Haiti",            lat: 18.54,  lon: -72.34,  type: "country" },
  { name: "Hungary",          lat: 47.50,  lon: 19.04,   type: "country" },
  { name: "India",            lat: 28.61,  lon: 77.23,   type: "country" },
  { name: "Indonesia",        lat: -6.21,  lon: 106.85,  type: "country" },
  { name: "Iran",             lat: 35.69,  lon: 51.39,   type: "country" },
  { name: "Iraq",             lat: 33.34,  lon: 44.40,   type: "country" },
  { name: "Israel",           lat: 31.77,  lon: 35.22,   type: "country" },
  { name: "Italy",            lat: 41.90,  lon: 12.50,   type: "country" },
  { name: "Japan",            lat: 35.68,  lon: 139.69,  type: "country" },
  { name: "Jordan",           lat: 31.95,  lon: 35.93,   type: "country" },
  { name: "Kenya",            lat: -1.29,  lon: 36.82,   type: "country" },
  { name: "Lebanon",          lat: 33.89,  lon: 35.50,   type: "country" },
  { name: "Libya",            lat: 32.90,  lon: 13.18,   type: "country" },
  { name: "Mexico",           lat: 19.43,  lon: -99.13,  type: "country" },
  { name: "Myanmar",          lat: 19.75,  lon: 96.08,   type: "country" },
  { name: "Netherlands",      lat: 52.37,  lon: 4.90,    type: "country" },
  { name: "New Zealand",      lat: -41.29, lon: 174.78,  type: "country" },
  { name: "Nigeria",          lat: 9.07,   lon: 7.40,    type: "country" },
  { name: "North Korea",      lat: 39.02,  lon: 125.75,  type: "country" },
  { name: "Norway",           lat: 59.91,  lon: 10.75,   type: "country" },
  { name: "Pakistan",         lat: 33.72,  lon: 73.04,   type: "country" },
  { name: "Philippines",      lat: 14.60,  lon: 120.98,  type: "country" },
  { name: "Poland",           lat: 52.23,  lon: 21.01,   type: "country" },
  { name: "Portugal",         lat: 38.72,  lon: -9.14,   type: "country" },
  { name: "Romania",          lat: 44.43,  lon: 26.10,   type: "country" },
  { name: "Russia",           lat: 55.75,  lon: 37.62,   type: "country" },
  { name: "Saudi Arabia",     lat: 24.69,  lon: 46.72,   type: "country" },
  { name: "South Africa",     lat: -25.74, lon: 28.19,   type: "country" },
  { name: "South Korea",      lat: 37.56,  lon: 126.97,  type: "country" },
  { name: "Spain",            lat: 40.42,  lon: -3.70,   type: "country" },
  { name: "Sri Lanka",        lat: 6.93,   lon: 79.85,   type: "country" },
  { name: "Sudan",            lat: 15.55,  lon: 32.53,   type: "country" },
  { name: "Sweden",           lat: 59.33,  lon: 18.07,   type: "country" },
  { name: "Switzerland",      lat: 46.95,  lon: 7.45,    type: "country" },
  { name: "Syria",            lat: 33.51,  lon: 36.29,   type: "country" },
  { name: "Taiwan",           lat: 25.04,  lon: 121.56,  type: "country" },
  { name: "Thailand",         lat: 13.75,  lon: 100.52,  type: "country" },
  { name: "Turkey",           lat: 39.93,  lon: 32.86,   type: "country" },
  { name: "UK",               lat: 51.50,  lon: -0.13,   type: "country" },
  { name: "USA",              lat: 38.90,  lon: -77.04,  type: "country" },
  { name: "Ukraine",          lat: 50.45,  lon: 30.52,   type: "country" },
  { name: "United Kingdom",   lat: 51.50,  lon: -0.13,   type: "country" },
  { name: "United States",    lat: 38.90,  lon: -77.04,  type: "country" },
  { name: "Venezuela",        lat: 10.49,  lon: -66.88,  type: "country" },
  { name: "Vietnam",          lat: 21.03,  lon: 105.85,  type: "country" },

  // Major cities
  { name: "Addis Ababa",      lat: 9.03,   lon: 38.74,   type: "city" },
  { name: "Abu Dhabi",        lat: 24.45,  lon: 54.38,   type: "city" },
  { name: "Amsterdam",        lat: 52.37,  lon: 4.90,    type: "city" },
  { name: "Ankara",           lat: 39.93,  lon: 32.86,   type: "city" },
  { name: "Baghdad",          lat: 33.34,  lon: 44.40,   type: "city" },
  { name: "Bangkok",          lat: 13.75,  lon: 100.52,  type: "city" },
  { name: "Beijing",          lat: 39.90,  lon: 116.40,  type: "city" },
  { name: "Berlin",           lat: 52.52,  lon: 13.41,   type: "city" },
  { name: "Bogota",           lat: 4.71,   lon: -74.07,  type: "city" },
  { name: "Brussels",         lat: 50.85,  lon: 4.35,    type: "city" },
  { name: "Buenos Aires",     lat: -34.60, lon: -58.38,  type: "city" },
  { name: "Cairo",            lat: 30.06,  lon: 31.25,   type: "city" },
  { name: "Canberra",         lat: -35.28, lon: 149.13,  type: "city" },
  { name: "Caracas",          lat: 10.49,  lon: -66.88,  type: "city" },
  { name: "Chicago",          lat: 41.88,  lon: -87.63,  type: "city" },
  { name: "Colombo",          lat: 6.93,   lon: 79.85,   type: "city" },
  { name: "Damascus",         lat: 33.51,  lon: 36.29,   type: "city" },
  { name: "Davos",            lat: 46.80,  lon: 9.84,    type: "city" },
  { name: "Dhaka",            lat: 23.72,  lon: 90.40,   type: "city" },
  { name: "Doha",             lat: 25.29,  lon: 51.53,   type: "city" },
  { name: "Dubai",            lat: 25.20,  lon: 55.27,   type: "city" },
  { name: "Geneva",           lat: 46.20,  lon: 6.15,    type: "city" },
  { name: "Hanoi",            lat: 21.03,  lon: 105.85,  type: "city" },
  { name: "Havana",           lat: 23.13,  lon: -82.38,  type: "city" },
  { name: "Houston",          lat: 29.76,  lon: -95.37,  type: "city" },
  { name: "Islamabad",        lat: 33.72,  lon: 73.04,   type: "city" },
  { name: "Istanbul",         lat: 41.01,  lon: 28.95,   type: "city" },
  { name: "Jakarta",          lat: -6.21,  lon: 106.85,  type: "city" },
  { name: "Jerusalem",        lat: 31.77,  lon: 35.22,   type: "city" },
  { name: "Johannesburg",     lat: -26.20, lon: 28.04,   type: "city" },
  { name: "Kabul",            lat: 34.53,  lon: 69.17,   type: "city" },
  { name: "Karachi",          lat: 24.86,  lon: 67.01,   type: "city" },
  { name: "Khartoum",         lat: 15.55,  lon: 32.53,   type: "city" },
  { name: "Kiev",             lat: 50.45,  lon: 30.52,   type: "city" },
  { name: "Kyiv",             lat: 50.45,  lon: 30.52,   type: "city" },
  { name: "Lagos",            lat: 6.52,   lon: 3.38,    type: "city" },
  { name: "London",           lat: 51.51,  lon: -0.13,   type: "city" },
  { name: "Los Angeles",      lat: 34.05,  lon: -118.24, type: "city" },
  { name: "Madrid",           lat: 40.42,  lon: -3.70,   type: "city" },
  { name: "Manila",           lat: 14.60,  lon: 120.98,  type: "city" },
  { name: "Melbourne",        lat: -37.81, lon: 144.96,  type: "city" },
  { name: "Mexico City",      lat: 19.43,  lon: -99.13,  type: "city" },
  { name: "Mogadishu",        lat: 2.04,   lon: 45.34,   type: "city" },
  { name: "Moscow",           lat: 55.75,  lon: 37.62,   type: "city" },
  { name: "Mumbai",           lat: 19.08,  lon: 72.88,   type: "city" },
  { name: "Nairobi",          lat: -1.29,  lon: 36.82,   type: "city" },
  { name: "New Delhi",        lat: 28.61,  lon: 77.23,   type: "city" },
  { name: "New York",         lat: 40.71,  lon: -74.01,  type: "city" },
  { name: "Ottawa",           lat: 45.42,  lon: -75.69,  type: "city" },
  { name: "Paris",            lat: 48.86,  lon: 2.35,    type: "city" },
  { name: "Pyongyang",        lat: 39.02,  lon: 125.74,  type: "city" },
  { name: "Rome",             lat: 41.90,  lon: 12.50,   type: "city" },
  { name: "Riyadh",           lat: 24.69,  lon: 46.72,   type: "city" },
  { name: "Santiago",         lat: -33.46, lon: -70.65,  type: "city" },
  { name: "Seoul",            lat: 37.57,  lon: 126.98,  type: "city" },
  { name: "Shanghai",         lat: 31.23,  lon: 121.47,  type: "city" },
  { name: "Strasbourg",       lat: 48.58,  lon: 7.75,    type: "city" },
  { name: "Sydney",           lat: -33.87, lon: 151.21,  type: "city" },
  { name: "Taipei",           lat: 25.04,  lon: 121.56,  type: "city" },
  { name: "Tehran",           lat: 35.69,  lon: 51.39,   type: "city" },
  { name: "Tel Aviv",         lat: 32.08,  lon: 34.78,   type: "city" },
  { name: "The Hague",        lat: 52.08,  lon: 4.31,    type: "city" },
  { name: "Tokyo",            lat: 35.68,  lon: 139.69,  type: "city" },
  { name: "Toronto",          lat: 43.65,  lon: -79.38,  type: "city" },
  { name: "Tripoli",          lat: 32.90,  lon: 13.18,   type: "city" },
  { name: "Vienna",           lat: 48.21,  lon: 16.37,   type: "city" },
  { name: "Warsaw",           lat: 52.23,  lon: 21.01,   type: "city" },
  { name: "Washington",       lat: 38.90,  lon: -77.04,  type: "city" },
  { name: "Yangon",           lat: 16.87,  lon: 96.19,   type: "city" },

  // Conflict / geopolitical regions
  { name: "Gaza",             lat: 31.52,  lon: 34.47,   type: "region" },
  { name: "West Bank",        lat: 31.95,  lon: 35.30,   type: "region" },
  { name: "Kashmir",          lat: 34.08,  lon: 74.80,   type: "region" },
  { name: "Donbas",           lat: 47.98,  lon: 37.80,   type: "region" },
  { name: "Crimea",           lat: 45.35,  lon: 34.10,   type: "region" },
  { name: "Balkans",          lat: 43.00,  lon: 22.00,   type: "region" },

  // Continental / broad regions
  { name: "Middle East",      lat: 29.31,  lon: 42.46,   type: "region" },
  { name: "Southeast Asia",   lat: 12.00,  lon: 105.00,  type: "region" },
  { name: "Eastern Europe",   lat: 52.00,  lon: 25.00,   type: "region" },
  { name: "Latin America",    lat: -6.00,  lon: -60.00,  type: "region" },
  { name: "Sub-Saharan Africa", lat: 2.00, lon: 20.00,   type: "region" },
  { name: "Arctic",           lat: 80.00,  lon: 0.00,    type: "region" },
  { name: "Pacific",          lat: 0.00,   lon: -160.00, type: "region" },
  { name: "Baltic",           lat: 57.00,  lon: 23.00,   type: "region" },

  // US States (appear in political/weather stories without a city name)
  { name: "Alaska",           lat: 64.20,  lon: -153.37, type: "region" },
  { name: "Arizona",          lat: 34.05,  lon: -111.09, type: "region" },
  { name: "California",       lat: 36.78,  lon: -119.42, type: "region" },
  { name: "Colorado",         lat: 39.55,  lon: -105.78, type: "region" },
  { name: "Florida",          lat: 27.99,  lon: -81.76,  type: "region" },
  { name: "Georgia",          lat: 32.16,  lon: -82.90,  type: "region" },
  { name: "Hawaii",           lat: 19.74,  lon: -155.84, type: "region" },
  { name: "Michigan",         lat: 44.18,  lon: -84.51,  type: "region" },
  { name: "Minnesota",        lat: 46.39,  lon: -94.64,  type: "region" },
  { name: "Nevada",           lat: 38.80,  lon: -116.42, type: "region" },
  { name: "North Carolina",   lat: 35.63,  lon: -79.81,  type: "region" },
  { name: "Ohio",             lat: 40.39,  lon: -82.76,  type: "region" },
  { name: "Oregon",           lat: 44.57,  lon: -122.07, type: "region" },
  { name: "Pennsylvania",     lat: 41.20,  lon: -77.19,  type: "region" },
  { name: "Texas",            lat: 31.97,  lon: -99.90,  type: "region" },
  { name: "Virginia",         lat: 37.77,  lon: -78.17,  type: "region" },
  { name: "Wisconsin",        lat: 44.27,  lon: -89.62,  type: "region" },
];

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Find the best geographic match in a string of text.
 * Prefers city > region > country specificity.
 */
export function geoTagText(text: string): GeoLocation | null {
  const lower = text.toLowerCase();
  let best: GeoLocation | null = null;

  for (const loc of LOCATIONS) {
    if (lower.includes(loc.name.toLowerCase())) {
      if (!best || TYPE_PRIORITY[loc.type] > TYPE_PRIORITY[best.type]) {
        best = loc;
      }
    }
  }

  return best;
}

/**
 * Geo-tag an array of clusters.
 * Scans topic + first 3 article titles.
 * Returns only clusters that matched a location.
 */
export function geoTagClusters(
  clusters: Array<{
    id: string;
    topic: string;
    articles: Array<{ title: string }>;
  }>
): GeoTaggedCluster[] {
  const results: GeoTaggedCluster[] = [];

  for (const cluster of clusters) {
    const searchText = [
      cluster.topic,
      ...cluster.articles.slice(0, 3).map((a) => a.title),
    ].join(" ");

    const loc = geoTagText(searchText);
    if (loc) {
      results.push({
        id: cluster.id,
        topic: cluster.topic,
        lat: loc.lat,
        lon: loc.lon,
        locationName: loc.name,
      });
    }
  }

  return results;
}
