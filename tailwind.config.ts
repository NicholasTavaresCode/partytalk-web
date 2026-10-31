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

/**
 * A colour that follows the theme: its RGB channels live in a CSS variable,
 * with the light values on `:root` and the dark ones under `.dark` (globals.css).
 * `<alpha-value>` keeps opacity modifiers like `border-ink/10` working.
 */
const themed = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Text and outlines: near-black in light mode, near-white in dark. Text sitting
        // on a bright fill (lime, coral, the AI banner) uses `ink-fixed`, which never flips.
        ink: { DEFAULT: themed("ink"), fixed: INK },
        cream: themed("cream"),
        /** Card and panel backgrounds: white in light mode. Plain `white` stays white (text on purple/coral). */
        card: themed("card"),
        lime: { DEFAULT: "#d2e823", light: "#e4f738", dim: "#bdd200" },
        /** `DEFAULT` is the fill (white text on it); `fg` is purple *text*, lighter in dark mode. */
        purple: { DEFAULT: "#7924ff", light: themed("purple-light"), fg: themed("purple-fg") },
        /** Fill only, with ink-fixed text: white on it or it as text is below AA — use `secondary`. */
        coral: "#ff522b",
        /** Destructive fills (End, Leave, error toasts) with white text, in both themes. */
        danger: { DEFAULT: "#c9350f", hover: "#a82a08" },

        primary: themed("ink"),
        "primary-container": themed("primary-container"),
        "on-primary": "#ffffff",
        "on-primary-container": "#c9cbd1",
        "primary-fixed": "#d2e823",
        "primary-fixed-dim": "#bdd200",
        "on-primary-fixed": INK,
        "on-primary-fixed-variant": "#434b00",
        // Coral text, deepened to pass AA on light and lightened on dark. Fills use `danger`.
        secondary: themed("secondary"),
        "secondary-container": themed("secondary-container"),
        "on-secondary": "#ffffff",
        "on-secondary-container": "#ffffff",
        "secondary-fixed": "#ffdbd1",
        "secondary-fixed-dim": "#ffb4a1",
        "on-secondary-fixed": "#3d0700",
        "on-secondary-fixed-variant": "#8a1c00",
        tertiary: themed("tertiary"),
        "tertiary-container": "#bdd200",
        "tertiary-fixed": "#d2e823",
        "tertiary-fixed-dim": "#bdd200",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#1a1e00",
        "on-tertiary-fixed": INK,
        "on-tertiary-fixed-variant": themed("on-tertiary-fixed-variant"),
        error: themed("error"),
        "error-container": themed("error-container"),
        "on-error": "#ffffff",
        "on-error-container": themed("on-error-container"),
        background: themed("cream"),
        "on-background": themed("ink"),
        surface: themed("cream"),
        "surface-bright": themed("cream"),
        "surface-dim": themed("surface-dim"),
        "surface-container-lowest": themed("card"),
        "surface-container-low": themed("surface-container-low"),
        "surface-container": themed("surface-container"),
        "surface-container-high": themed("surface-container-high"),
        "surface-container-highest": themed("surface-container-highest"),
        "surface-variant": themed("surface-container-highest"),
        "on-surface": themed("ink"),
        "on-surface-variant": themed("on-surface-variant"),
        "inverse-surface": "#2c2e33",
        "inverse-on-surface": "#f3f0e8",
        "inverse-primary": "#d2e823",
        outline: themed("outline"),
        "outline-variant": themed("outline-variant"),
        "surface-tint": themed("ink"),
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
        // Ink in light mode, black in dark (an ink-coloured shadow would glow).
        "pop-sm": "2px 2px 0 0 rgb(var(--pop))",
        pop: "4px 4px 0 0 rgb(var(--pop))",
        "pop-lg": "6px 6px 0 0 rgb(var(--pop))",
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
      },
    },
  },
  plugins: [],
};

export default config;
