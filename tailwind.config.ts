import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vn: {
          bg:           "#141414",   // dark charcoal
          panel:        "#1c1c1c",   // card / panel surface
          border:       "#2a2a2a",   // subtle separator
          cyan:         "#e8773a",   // primary accent — warm orange (variable kept for compatibility)
          "cyan-dim":   "#e8773a33",
          orange:       "#f5a55c",   // secondary / amber
          "orange-dim": "#f5a55c33",
          red:          "#e05848",   // warm red
          "red-dim":    "#e0584833",
          green:        "#5fb85f",   // muted natural green
          "green-dim":  "#5fb85f33",
          text:         "#f0ede8",   // warm off-white
          "text-dim":   "#807870",   // warm grey
        },
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        body: ["Inter", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        scanline: "scanline 4s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
