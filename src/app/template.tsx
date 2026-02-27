"use client";

// template.tsx re-renders on EVERY route change (unlike layout.tsx which persists).
// This is the correct Next.js App Router hook for per-page transitions.

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="animate-fade-in"
      style={{ animation: "fadeIn 0.3s ease-out" }}
    >
      {children}
    </div>
  );
}
