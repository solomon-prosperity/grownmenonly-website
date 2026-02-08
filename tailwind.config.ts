import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          900: "#0a0a0a",
          800: "#1a1a1a",
          700: "#2a2a2a",
        },
        wood: {
          500: "#8B6F47",
          600: "#6B5635",
        },
        leather: {
          500: "#5C4033",
          600: "#4A3326",
        },
      },
    },
  },
  plugins: [],
};
export default config;
