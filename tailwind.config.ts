import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#bfd3ff",
          300: "#92b5ff",
          400: "#5f8cff",
          500: "#3b6ef6",
          600: "#2754db",
          700: "#2145b8",
          800: "#203d95",
          900: "#223876"
        }
      }
    }
  },
  plugins: [typography]
};

export default config;
