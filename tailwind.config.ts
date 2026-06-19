import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        paper: "#f8fafc",
        canvas: "#f4f7fb",
        line: "#dbe3ee",
        cobalt: "#2558d8",
        mint: "#0f9b72",
        coral: "#df5c45",
        amber: "#c98a1f",
      },
      boxShadow: {
        studio: "0 24px 80px rgba(26, 32, 44, 0.14)",
        soft: "0 14px 38px rgba(19, 32, 52, 0.08)",
        brand: "0 12px 28px rgba(37, 88, 216, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
