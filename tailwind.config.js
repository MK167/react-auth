/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate";

export default {
  // Enable class-based dark mode so ThemeProvider can toggle it by adding/removing
  // the 'dark' class on <html>. This is required for all dark: utility variants to work.
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // gray-750 is a common in-between shade used in dark sidebar/table rows.
      // Tailwind doesn't include it by default; we define it here.
      colors: {
        gray: {
          750: "#2d3748",
        },
      },
    },
  },
  plugins: [animate],
};
