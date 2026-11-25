import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Royal Cosmic Palette (60-30-10 System)
        cosmic: {
          // 60% Dominant Void (Dark)
          void: "#090A0F",
          obsidian: "#0B0E14",
          midnight: "#0F1322",
          indigo: "#1E2761",
          
          // 60% Dominant Starlight & Marble (Light Mode)
          alabaster: "#FAF9F6",
          pearl: "#F8FAFC",
          moonstone: "#F1F5F9",
          mist: "#EDEFF5",
          
          // 30% Secondary Brand & Structure (Dark Mode)
          royal: "#2E4A9E",
          cobalt: "#408EC6",
          plum: "#5C1D42",
          amethyst: "#7A2048",
          velvet: "#381335",

          // 30% Secondary Royal Ink & Celestial Dusk (Light Mode)
          royalIndigo: "#1E1B4B",
          midnightBlue: "#1E293B",
          softLavender: "#DDD6FE",
          dustyAmethyst: "#6D28D9",
          
          // 10% Starlight, Crown Gold & Astral Glow (Dark Mode)
          gold: "#D4AF37",
          brass: "#E5C158",
          champagne: "#F5E6BE",
          astral: "#6EE7B7",
          cyan: "#A5F3FC",
          starlight: "#E2E8F0",

          // 10% Burnished Gold & Solar Flare (Light Mode)
          burnishedGold: "#B48A28",
          antiqueGold: "#C59B27",
          cosmicCobalt: "#3B82F6",
          electricPeriwinkle: "#4F46E5",
        },
      },
      fontFamily: {
        serif: ["var(--font-cinzel)", "Georgia", "serif"],
        sans: ["var(--font-space)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(1.04)" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        floatUp: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" },
        },
        nebulaDrift: {
          "0%, 100%": { transform: "scale(1) translate(0, 0)" },
          "50%": { transform: "scale(1.08) translate(15px, -10px)" },
        },
        haloRotate: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        auroraGlow: {
          "0%, 100%": { opacity: "0.4", filter: "blur(40px)" },
          "50%": { opacity: "0.75", filter: "blur(60px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s infinite linear",
        "fade-in": "fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "pulse-slow": "pulseSlow 3.5s ease-in-out infinite",
        float: "floatUp 4s ease-in-out infinite",
        nebula: "nebulaDrift 20s ease-in-out infinite",
        "halo-spin": "haloRotate 12s linear infinite",
        aurora: "auroraGlow 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
