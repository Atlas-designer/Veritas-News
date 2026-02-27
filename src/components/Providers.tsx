"use client";

/**
 * Client-side provider tree.
 * layout.tsx is a server component so it can't directly use
 * client context — this wrapper keeps things clean.
 */

import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
