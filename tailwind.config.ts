import type { Config } from "tailwindcss";

/**
 * PartyTalk design tokens.
 *
 * The color / type / spacing scale is lifted verbatim from the Google Stitch
 * "Standard Academic Assessment System" so the IELTS exam simulation matches the
 * official computer-delivered interface. The marketing + group-practice surfaces
 * reuse the same palette (navy primary, gold accent) with the Sora display font
 * for a warmer, more social feel.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#001e40",
        "primary-container": "#003366",
        "on-primary": "#ffffff",
        "on-primary-container": "#799dd6",
        "primary-fixed": "#d5e3ff",
        "primary-fixed-dim": "#a7c8ff",
        "on-primary-fixed": "#001b3c",
        "on-primary-fixed-variant": "#1f477b",
        secondary: "#bb0027",
        "secondary-container": "#e51a38",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#fffbff",
        "secondary-fixed": "#ffdad8",
        "secondary-fixed-dim": "#ffb3b1",
        "on-secondary-fixed": "#410007",
        "on-secondary-fixed-variant": "#92001d",
        tertiary: "#705d00",
        "tertiary-container": "#c9a900",
        "tertiary-fixed": "#ffe16d",
        "tertiary-fixed-dim": "#e9c400",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#4c3e00",
        "on-tertiary-fixed": "#221b00",
        "on-tertiary-fixed-variant": "#544600",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        background: "#f8fafb",
        "on-background": "#191c1d",
        surface: "#f8fafb",
        "surface-bright": "#f8fafb",
        "surface-dim": "#d8dadb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f5",
        "surface-container": "#eceeef",
        "surface-container-high": "#e6e8e9",
        "surface-container-highest": "#e1e3e4",
        "surface-variant": "#e1e3e4",
        "on-surface": "#191c1d",
        "on-surface-variant": "#43474f",
        "inverse-surface": "#2e3132",
        "inverse-on-surface": "#eff1f2",
        "inverse-primary": "#a7c8ff",
        outline: "#737780",
        "outline-variant": "#c3c6d1",
        "surface-tint": "#3a5f94",
      },
      fontFamily: {
        sans: ["var(--font-arimo)", "Arial", "Helvetica", "sans-serif"],
        arimo: ["var(--font-arimo)", "Arial", "Helvetica", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-arimo)", "sans-serif"],
        "headline-lg": ["var(--font-arimo)", "Arial", "sans-serif"],
        "headline-md": ["var(--font-arimo)", "Arial", "sans-serif"],
        "body-lg": ["var(--font-arimo)", "Arial", "sans-serif"],
        "body-md": ["var(--font-arimo)", "Arial", "sans-serif"],
        "label-caps": ["var(--font-arimo)", "Arial", "sans-serif"],
        "question-num": ["var(--font-arimo)", "Arial", "sans-serif"],
        "display-timer": ["var(--font-arimo)", "Arial", "sans-serif"],
      },
      fontSize: {
        "display-timer": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["20px", { lineHeight: "28px", fontWeight: "700" }],
        "headline-md": ["18px", { lineHeight: "24px", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "700" }],
        "question-num": ["14px", { lineHeight: "20px", fontWeight: "700" }],
      },
      spacing: {
        "header-height": "64px",
        "nav-footer-height": "72px",
        gutter: "24px",
        "margin-page": "32px",
        "split-gap": "2px",
      },
      borderRadius: {
        none: "0",
        sm: "0.125rem", // 2px — exam chips/inputs
        DEFAULT: "0.125rem",
        lg: "0.25rem", // 4px — exam buttons
        xl: "0.5rem", // 8px — exam cards
        "2xl": "1rem",
        "3xl": "1.5rem",
        pill: "9999px",
        full: "9999px",
      },
      maxWidth: {
        content: "1200px",
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
      },
      animation: {
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fade-up 0.6s ease both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
