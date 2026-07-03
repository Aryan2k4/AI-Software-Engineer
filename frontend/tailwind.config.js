/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#050506",
          900: "#0a0b0d",
          800: "#111318",
          700: "#1a1d24",
          600: "#22262f",
          500: "#2d3139",
        },
        teal: {
          400: "#2DD4BF",
          500: "#14B8A6",
          300: "#5EEAD4",
        },
        navy: {
          900: "#0f2035",
          800: "#1e3a5f",
          700: "#2d5282",
        },
        ice: {
          100: "#f0f4f8",
          200: "#dce6f0",
          300: "#b8cfe0",
          400: "#8aadca",
          500: "#6690b0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "graphite-gradient": "linear-gradient(135deg, #0a0b0d 0%, #111318 50%, #0a0b0d 100%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
