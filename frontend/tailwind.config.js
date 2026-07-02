/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#101828",
          50: "#F5F6F8",
          100: "#E7E9EE",
          300: "#9AA2B2",
          500: "#4A5468",
          700: "#242D3D",
          900: "#101828",
        },
        forest: {
          DEFAULT: "#1F4B3F",
          50: "#EAF1EE",
          100: "#CFE0D8",
          300: "#6B9C88",
          500: "#2E6653",
          700: "#1F4B3F",
          900: "#122E26",
        },
        brass: {
          DEFAULT: "#C08A2E",
          50: "#FBF3E4",
          100: "#F3E0B8",
          300: "#DBB264",
          500: "#C08A2E",
          700: "#8F6620",
        },
        paper: "#F5F7FA",
        card: "#FFFFFF",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "ticket-stub":
          "radial-gradient(circle at 0 50%, transparent 8px, var(--tw-gradient-stops)), radial-gradient(circle at 100% 50%, transparent 8px, var(--tw-gradient-stops))",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)",
      },
    },
  },
  plugins: [],
};
