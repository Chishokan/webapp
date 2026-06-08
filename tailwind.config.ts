import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // 智翔館ブランドカラー（青）
        brand: {
          50: "#eef4fb",
          100: "#d5e4f4",
          200: "#aecbeb",
          300: "#7dacdc",
          400: "#4a87c9",
          500: "#2468b3",
          600: "#15539a",
          700: "#114480",
          800: "#0f3a6b",
          900: "#0d3158",
        },
        // 智翔館ブランドカラー（ゴールド/サンイエロー）
        gold: {
          50: "#fff9e8",
          100: "#ffefc0",
          200: "#ffe18a",
          300: "#ffce47",
          400: "#fbbd1f",
          500: "#f0a500",
          600: "#cc8500",
          700: "#a36600",
        },
      },
    },
  },
  plugins: [],
};

export default config;
