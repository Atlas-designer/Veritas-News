export type FeatureFlags = {
  FACT_CHECK_ENABLED: boolean;
  RECAP_ENABLED: boolean;
  MAP_ENABLED: boolean;
  REDUCED_NETWORK_MODE: boolean;
};

const DEFAULTS: FeatureFlags = {
  FACT_CHECK_ENABLED: true,
  RECAP_ENABLED: true,
  MAP_ENABLED: true,
  REDUCED_NETWORK_MODE: false,
};

// Cache TTLs (ms)
export const CACHE_TTL = {
  NEWS: 15 * 60 * 1000,           // 15 minutes
  FACT_CHECK: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Rate limits
export const RATE_LIMITS = {
  NEWS_MIN_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes between refreshes
  FACT_CHECK_PER_DAY: 50,
} as const;

export function getFlags(): FeatureFlags {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const stored = localStorage.getItem("vn:flags");
    if (!stored) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {
    return DEFAULTS;
  }
}

export function setFlag<K extends keyof FeatureFlags>(
  key: K,
  value: FeatureFlags[K]
): void {
  const current = getFlags();
  current[key] = value;
  localStorage.setItem("vn:flags", JSON.stringify(current));
}
