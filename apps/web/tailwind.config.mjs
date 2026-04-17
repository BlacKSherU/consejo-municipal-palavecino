import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#9B2D8A",
          light: "#9c27b0",
          dark: "#6a1b9a",
          muted: "#ce93d8",
        },
        "brand-teal": {
          DEFAULT: "#008D96",
          light: "#26a69a",
          dark: "#00695c",
        },
        "brand-sky": {
          DEFAULT: "#7ACCF2",
          light: "#81d4fa",
          dark: "#0288d1",
        },
        "brand-cyan": {
          DEFAULT: "#56E3E3",
          light: "#80ffff",
          dark: "#008b8b",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-light":
          "linear-gradient(135deg, #f5e6f4 0%, #e0f4f5 45%, #e3f4fc 100%)",
        "hero-dark":
          "linear-gradient(135deg, #1a1025 0%, #0d1f1c 50%, #0a1628 100%)",
        "brand-gradient":
          "linear-gradient(120deg, #9B2D8A 0%, #008D96 50%, #7ACCF2 100%)",
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
  plugins: [typography],
};
