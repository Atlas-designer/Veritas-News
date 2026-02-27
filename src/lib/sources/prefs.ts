/**
 * Client-side persistence for disabled news sources.
 * Uses localStorage so preferences survive page refreshes.
 */

const STORAGE_KEY = "vn:disabled-sources";

export function getDisabledSources(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function setDisabledSources(domains: Set<string>): void {
  if (typeof window === "undefined") return;
  if (domains.size === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(domains)));
  }
}

export function toggleSource(domain: string): Set<string> {
  const disabled = getDisabledSources();
  if (disabled.has(domain)) {
    disabled.delete(domain);
  } else {
    disabled.add(domain);
  }
  setDisabledSources(disabled);
  return disabled;
}

export function enableAll(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function disableAll(domains: string[]): void {
  setDisabledSources(new Set(domains));
}
