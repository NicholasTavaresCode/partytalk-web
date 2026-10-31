import type { Config } from "tailwindcss";

/**
 * PartyTalk design tokens, from the Google Stitch project "PartyTalk Landing
 * Page": a warm cream canvas, ink structure, electric lime for action and
 * "live", purple for the AI host, and coral heat. Surfaces are chunky — 2px ink
 * borders with hard offset `pop` shadows.
 *
 * The Material-style role names (primary, surface, on-surface-variant, …) are
 * what components use, so they carry the palette; the brand names (ink, lime,
 * purple, coral, cream) are for the places that mean that exact color.
 */
const INK = "#141517";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: INK,
        cream: "#faf7f0",
        lime: { DEFAULT: "#d2e823", light: "#e4f738", dim: "#bdd200" },
        purple: { DEFAULT: "#7924ff", light: "#eaddff" },
        /** Fill only, with ink text: white on it or it as text is below AA — use `secondary`. */
        coral: "#ff522b",

        primary: INK,
        "primary-container": "#2c2e33",
        "on-primary": "#ffffff",
        "on-primary-container": "#c9cbd1",
        "primary-fixed": "#d2e823",
        "primary-fixed-dim": "#bdd200",
        "on-primary-fixed": INK,
        "on-primary-fixed-variant": "#434b00",
        // Coral, deepened so text and white-on-fill pass AA.
        secondary: "#c9350f",
        "secondary-container": "#a82a08",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#ffffff",
        "secondary-fixed": "#ffdbd1",
        "secondary-fixed-dim": "#ffb4a1",
        "on-secondary-fixed": "#3d0700",
        "on-secondary-fixed-variant": "#8a1c00",
        tertiary: "#596400",
        "tertiary-container": "#bdd200",
        "tertiary-fixed": "#d2e823",
        "tertiary-fixed-dim": "#bdd200",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#1a1e00",
        "on-tertiary-fixed": INK,
        "on-tertiary-fixed-variant": "#434b00",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        background: "#faf7f0",
        "on-background": INK,
        surface: "#faf7f0",
        "surface-bright": "#faf7f0",
        "surface-dim": "#dcd7cb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f4f0e6",
        "surface-container": "#eeeadf",
        "surface-container-high": "#e8e3d7",
        "surface-container-highest": "#e2ddd0",
        "surface-variant": "#e2ddd0",
        "on-surface": INK,
        "on-surface-variant": "#4b4c45",
        "inverse-surface": "#2c2e33",
        "inverse-on-surface": "#f3f0e8",
        "inverse-primary": "#d2e823",
        outline: "#78786d",
        "outline-variant": "#d9d4c7",
        "surface-tint": INK,
        /** The live room: a dark stage built from ink. */
        stage: { DEFAULT: "#1b1c1f", raised: "#26282c", tile: "#303237", hover: "#3a3d42" },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-bricolage)", "var(--font-jakarta)", "sans-serif"],
        /** Pills, badges, timers and other small all-caps labels. */
        label: ["var(--font-space)", "var(--font-jakarta)", "sans-serif"],
        "label-caps": ["var(--font-space)", "var(--font-jakarta)", "sans-serif"],
      },
      fontSize: {
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.06em", fontWeight: "700" }],
      },
      spacing: {
        "header-height": "64px",
        gutter: "24px",
        "margin-page": "32px",
      },
      borderRadius: {
        none: "0",
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        pill: "9999px",
        full: "9999px",
      },
      boxShadow: {
        "pop-sm": `2px 2px 0 0 ${INK}`,
        pop: `4px 4px 0 0 ${INK}`,
        "pop-lg": `6px 6px 0 0 ${INK}`,
      },
      maxWidth: {
        content: "1200px",
      },
      screens: {
        // Laptop-height and small-phone screens, where one-screen layouts tighten up.
        short: { raw: "(max-height: 760px)" },
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".3", transform: "scale(1.06)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        // A short shake, then a long rest: catches the eye without nagging.
        nudge: {
          "0%, 70%, 100%": { transform: "rotate(0deg) scale(1)" },
          "75%": { transform: "rotate(-14deg) scale(1.15)" },
          "80%": { transform: "rotate(10deg) scale(1.15)" },
          "85%": { transform: "rotate(-6deg) scale(1.1)" },
          "90%": { transform: "rotate(3deg) scale(1.05)" },
        },
        "typing-dot": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.45" },
          "30%": { transform: "translateY(-2px)", opacity: "1" },
        },
        "voice-bar": {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        "topic-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "topic-highlight": {
          "0%": { backgroundColor: "rgba(210, 232, 35, 0.55)", boxShadow: "0 0 0 6px rgba(210, 232, 35, 0.35)", transform: "scale(1.02)" },
          "35%": { backgroundColor: "rgba(210, 232, 35, 0.35)", boxShadow: "0 0 0 2px rgba(210, 232, 35, 0.2)", transform: "scale(1)" },
          "100%": { backgroundColor: "rgba(210, 232, 35, 0.12)", boxShadow: "0 0 0 0 rgba(210, 232, 35, 0)", transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fade-up 0.6s ease both",
        float: "float 6s ease-in-out infinite",
        wiggle: "wiggle 3s ease-in-out infinite",
        nudge: "nudge 2.6s ease-in-out infinite",
        "typing-dot": "typing-dot 1.2s ease-in-out infinite",
        "voice-bar": "voice-bar 0.8s ease-in-out infinite",
        eq: "voice-bar 0.8s ease-in-out infinite",
        "topic-in": "topic-in 0.4s ease both",
        "topic-highlight": "topic-highlight 2.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
