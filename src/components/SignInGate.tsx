"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  onSignedIn: (username: string) => void;
}

export default function SignInGate({ onSignedIn }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = value.trim();
    if (!name) {
      setError("Please enter a username to continue.");
      return;
    }
    if (name.length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    onSignedIn(name);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-vn-bg flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(232,119,58,0.012) 2px,rgba(232,119,58,0.012) 4px)",
        }}
      />

      {/* HUD corner brackets */}
      <div className="absolute inset-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-vn-cyan/50" />
        <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-vn-cyan/50" />
        <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-vn-cyan/50" />
        <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-vn-cyan/50" />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-16 h-16 rounded-full border-2 border-vn-cyan flex items-center justify-center mb-4"
            style={{ boxShadow: "0 0 40px rgba(232,119,58,0.25)" }}
          >
            <span className="font-display text-xl font-bold text-vn-cyan">V</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-widest text-vn-cyan">
            VERITAS
          </h1>
          <p className="text-vn-text-dim text-sm mt-2 text-center">
            Intelligence-grade news verification
          </p>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="data-readout text-[10px] text-vn-text-dim block mb-2">
            CHOOSE A USERNAME
          </label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. tommy"
            maxLength={30}
            autoComplete="username"
            className="w-full bg-vn-panel border border-vn-border rounded-sm px-4 py-3 font-mono text-sm text-vn-text placeholder-vn-text-dim/40 focus:outline-none focus:border-vn-cyan transition-colors"
          />
          {error && (
            <p className="data-readout text-[9px] text-vn-red mt-1">{error}</p>
          )}
          <p className="data-readout text-[9px] text-vn-text-dim/50 mt-1">
            No password needed. Stored locally on this device.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full data-readout text-[11px] py-3 rounded-sm border border-vn-cyan bg-vn-cyan/10 text-vn-cyan hover:bg-vn-cyan/20 transition-all tracking-widest"
        >
          ENTER FEED →
        </button>
      </form>
    </div>
  );
}
