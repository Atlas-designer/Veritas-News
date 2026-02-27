/**
 * EPIC 3.3 — User Source Trust overrides in Firestore
 *
 * Firestore structure:
 *   /users/{uid}/sourceOverrides/{sourceDomain}
 *   { mode: "ABS" | "DELTA", value: number, note?: string, updatedAt: string }
 *
 * Cost safety:
 *   - Load overrides ONCE on login, cache in module-level Map
 *   - Never read per-article — apply from cached map
 *   - Only write when user explicitly changes a slider
 */

import {
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./config";

export type OverrideMode = "ABS" | "DELTA";

export interface SourceOverride {
  mode: OverrideMode;
  value: number;  // ABS: final score 0-100 | DELTA: offset -100 to +100
  note?: string;
  updatedAt: string;
}

// Module-level cache — loaded once on login, never re-fetched per article
let overrideCache: Record<string, SourceOverride> | null = null;

/**
 * Load all overrides for a user and cache them locally.
 * Call once after authentication.
 */
export async function loadOverrides(
  uid: string
): Promise<Record<string, SourceOverride>> {
  if (overrideCache !== null) return overrideCache;

  const col = collection(db, "users", uid, "sourceOverrides");
  const snap = await getDocs(col);

  const result: Record<string, SourceOverride> = {};
  snap.forEach((d) => {
    result[d.id] = d.data() as SourceOverride;
  });

  overrideCache = result;
  return result;
}

/** Get cached overrides synchronously (returns empty if not yet loaded). */
export function getCachedOverrides(): Record<string, SourceOverride> {
  return overrideCache ?? {};
}

/** Bust the in-memory cache (call after writing an override). */
export function bustOverrideCache(): void {
  overrideCache = null;
}

/**
 * Save a user override for a source domain.
 */
export async function setSourceOverride(
  uid: string,
  domain: string,
  override: Omit<SourceOverride, "updatedAt">
): Promise<void> {
  const ref = doc(db, "users", uid, "sourceOverrides", domain);
  const full: SourceOverride = {
    ...override,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, full);

  // Update cache immediately so UI reflects change without re-fetch
  if (overrideCache !== null) {
    overrideCache[domain] = full;
  }
}

/**
 * Reset a user's override for a domain back to default.
 */
export async function resetSourceOverride(
  uid: string,
  domain: string
): Promise<void> {
  const ref = doc(db, "users", uid, "sourceOverrides", domain);
  await deleteDoc(ref);

  if (overrideCache !== null) {
    delete overrideCache[domain];
  }
}

/**
 * Apply any user overrides to a source's base trust score.
 * Uses cached overrides — no Firestore reads at call time.
 */
export function applyOverride(baseScore: number, domain: string): number {
  const overrides = getCachedOverrides();
  const override = overrides[domain];
  if (!override) return baseScore;

  if (override.mode === "ABS") {
    return Math.max(0, Math.min(100, override.value));
  }
  if (override.mode === "DELTA") {
    return Math.max(0, Math.min(100, baseScore + override.value));
  }

  return baseScore;
}
