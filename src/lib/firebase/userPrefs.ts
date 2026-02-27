/**
 * Firestore helpers for per-user preferences.
 * Document path: users/{uid}
 * Shape: { disabledSources: string[], featureFlags: Record<string, boolean> }
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

export interface UserPrefs {
  disabledSources: string[];
  featureFlags: Record<string, boolean>;
}

export async function loadUserPrefs(uid: string): Promise<UserPrefs | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data() as UserPrefs;
  } catch {
    return null;
  }
}

export async function saveUserPrefs(
  uid: string,
  prefs: Partial<UserPrefs>
): Promise<void> {
  try {
    await setDoc(doc(db, "users", uid), prefs, { merge: true });
  } catch (e) {
    console.error("[userPrefs] save failed", e);
  }
}
