"use client";

/**
 * Client-side provider tree.
 * layout.tsx is a server component so it can't directly use
 * client context — this wrapper keeps things clean.
 *
 * Also orchestrates the sign-in gate and guided demo flow.
 */

import { ReactNode, useEffect, useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import SignInGate from "./SignInGate";
import GuidedDemo from "./GuidedDemo";
import { getUsername, setUsername } from "@/lib/auth/username";

const DEMO_KEY = "vn:demo-shown";

export default function Providers({ children }: { children: ReactNode }) {
  const [username, setUsernameState] = useState<string | null | undefined>(undefined);
  const [showDemo, setShowDemo] = useState(false);

  // On mount: check for existing session
  useEffect(() => {
    const existing = getUsername();
    setUsernameState(existing);
    // If already logged in, check whether to show demo
    if (existing && !localStorage.getItem(DEMO_KEY)) {
      setShowDemo(true);
    }
  }, []);

  const handleSignedIn = (name: string) => {
    setUsername(name);
    setUsernameState(name);
    // Show demo on first sign-in
    if (!localStorage.getItem(DEMO_KEY)) {
      setShowDemo(true);
    }
  };

  const handleDemoDone = () => {
    localStorage.setItem(DEMO_KEY, "1");
    setShowDemo(false);
  };

  // Hydrating — don't flash the gate or content during SSR/mount
  if (username === undefined) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-vn-bg" />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      {/* Sign-in gate — blocks until username is set */}
      {username === null && (
        <SignInGate onSignedIn={handleSignedIn} />
      )}

      {/* Guided demo — shown once after first sign-in */}
      {showDemo && username !== null && (
        <GuidedDemo onDone={handleDemoDone} />
      )}

      {/* App content — always rendered so NavBar + hydration work */}
      <div style={{ visibility: username === null ? "hidden" : "visible" }}>
        {children}
      </div>
    </AuthProvider>
  );
}
