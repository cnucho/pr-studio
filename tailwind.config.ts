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
        paper: "#f7f6f2",
        line: "#dedbd2",
        cobalt: "#2357d4",
        mint: "#1f9d72",
        coral: "#e05a47",
        amber: "#d79922",
      },
      boxShadow: {
        studio: "0 24px 80px rgba(26, 32, 44, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
