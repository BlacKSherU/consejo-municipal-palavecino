import typography from "@tailwindcss/typography";
import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,css}"],
  darkMode: "class",
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        // Paleta oficial CMBP: #A2298E magenta · #039680 teal · #019CD4 cian
        brand: {
          DEFAULT: "#A2298E",
          light: "#C44DB0",
          dark: "#7A1E6B",
          muted: "#D98FCB",
        },
        "brand-teal": {
          DEFAULT: "#039680",
          light: "#06C0A4",
          dark: "#02685A",
        },
        "brand-sky": {
          DEFAULT: "#019CD4",
          light: "#34B6E8",
          dark: "#017399",
        },
        "brand-cyan": {
          DEFAULT: "#019CD4",
          light: "#5CC4EC",
          dark: "#0277A3",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      ringOffsetColor: {
        background: "hsl(var(--background) / 1)",
      },
      backgroundImage: {
        "hero-light":
          "linear-gradient(135deg, #f7e4f3 0%, #e0f5f0 45%, #e2f4fc 100%)",
        "hero-dark":
          "linear-gradient(135deg, #1d0f1a 0%, #0a1f1b 50%, #08202c 100%)",
        "brand-gradient":
          "linear-gradient(120deg, #A2298E 0%, #039680 50%, #019CD4 100%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, tailwindcssAnimate],
};
