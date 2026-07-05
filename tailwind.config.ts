import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "oklch(0.04 0 0)",
        surface: "oklch(0.10 0 0)",
        "surface-container": "oklch(0.14 0 0)",
        "surface-hover": "oklch(0.18 0 0)",
        border: "oklch(0.22 0 0)",
        primary: {
          DEFAULT: "oklch(0.60 0.22 30)",
          hover: "oklch(0.55 0.22 30)",
          glow: "oklch(0.60 0.22 30 / 0.15)",
        },
        accent: {
          DEFAULT: "oklch(0.75 0.12 70)",
          hover: "oklch(0.70 0.12 70)",
        },
        ink: {
          DEFAULT: "oklch(0.95 0 0)",
          secondary: "oklch(0.60 0 0)",
          disabled: "oklch(0.35 0 0)",
        },
        error: "oklch(0.55 0.20 25)",
        success: "oklch(0.55 0.15 145)",
        warning: "oklch(0.65 0.15 85)",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "16px",
        pill: "9999px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', "monospace"],
      },
      fontSize: {
        xs: ["0.6875rem", { lineHeight: "1.3" }],
        sm: ["0.75rem", { lineHeight: "1.3" }],
        base: ["0.875rem", { lineHeight: "1.5" }],
        lg: ["1rem", { lineHeight: "1.4" }],
        xl: ["1.125rem", { lineHeight: "1.4" }],
        "2xl": ["1.5rem", { lineHeight: "1.2" }],
        "3xl": ["2rem", { lineHeight: "1.1" }],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      zIndex: {
        sidebar: "10",
        "player-bar": "20",
        "title-bar": "30",
        dropdown: "40",
        "modal-backdrop": "50",
        modal: "60",
        toast: "70",
        tooltip: "80",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      width: {
        sidebar: "260px",
        "sidebar-collapsed": "64px",
      },
      height: {
        "player-bar": "72px",
        "title-bar": "36px",
      },
    },
  },
  plugins: [],
};

export default config;
