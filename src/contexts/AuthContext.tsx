"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { loadUserPrefs, saveUserPrefs, type UserPrefs } from "@/lib/firebase/userPrefs";

interface AuthContextValue {
  uid: string | null;
  /** Write a partial prefs update to Firestore (no-op if not yet authenticated) */
  syncPrefs: (prefs: Partial<UserPrefs>) => void;
}

const AuthContext = createContext<AuthContextValue>({
  uid: null,
  syncPrefs: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to auth state; sign in anonymously if no session exists
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);

        // Hydrate localStorage from Firestore on first load
        const prefs = await loadUserPrefs(user.uid);
        if (prefs) {
          if (Array.isArray(prefs.disabledSources)) {
            localStorage.setItem(
              "vn:disabled-sources",
              JSON.stringify(prefs.disabledSources)
            );
          }
          if (prefs.featureFlags && typeof prefs.featureFlags === "object") {
            const current = JSON.parse(
              localStorage.getItem("vn:flags") || "{}"
            );
            localStorage.setItem(
              "vn:flags",
              JSON.stringify({ ...current, ...prefs.featureFlags })
            );
          }
        }
      } else {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("[auth] Anonymous sign-in failed", e);
        }
      }
    });

    return unsubscribe;
  }, []);

  const syncPrefs = (prefs: Partial<UserPrefs>) => {
    if (!uid) return;
    saveUserPrefs(uid, prefs);
  };

  return (
    <AuthContext.Provider value={{ uid, syncPrefs }}>
      {children}
    </AuthContext.Provider>
  );
}
