/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          blue: "#1E3A8A",      // Deep Navy / Government blue
          lightBlue: "#0284C7", // Official accent
          gold: "#D97706",      // Emblem gold
          dark: "#0F172A",      // Slate 900
          surface: "#F8FAFC",   // Clean surface
          border: "#E2E8F0"
        },
        compliance: {
          compliant: "#16A34A",       // Green
          potential: "#CA8A04",       // Yellow/Amber
          review: "#EA580C",          // Orange
          violation: "#DC2626"        // Red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
