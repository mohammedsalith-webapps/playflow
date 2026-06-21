/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: {
            DEFAULT: "#8B5CF6",
            light: "#A78BFA",
            dark: "#7C3AED",
          },
          pink: {
            DEFAULT: "#EC4899",
            light: "#F472B6",
            dark: "#DB2777",
          },
          cyan: {
            DEFAULT: "#06B6D4",
            light: "#22D3EE",
            dark: "#0891B2",
          },
          dark: {
            bg: "#0B0F19",
            card: "rgba(20, 24, 38, 0.7)",
            border: "rgba(255, 255, 255, 0.08)",
          },
          light: {
            bg: "#F8FAFC",
            card: "rgba(255, 255, 255, 0.7)",
            border: "rgba(0, 0, 0, 0.08)",
          }
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      }
    },
  },
  plugins: [],
}
