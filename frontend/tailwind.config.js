/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1E60D5",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#1E60D5", // Primary brand blue
          700: "#1D4ED8",
          850: "#1E40AF",
          900: "#1E3A8A",
        },
        ink: {
          DEFAULT: "#0F172A",
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          700: "#334155",
          900: "#0F172A",
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
        paper: "#F8FAFC",
        card: "#FFFFFF",
      },
      fontFamily: {
        display: ["Outfit", "Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "ticket-stub":
          "radial-gradient(circle at 0 50%, transparent 8px, var(--tw-gradient-stops)), radial-gradient(circle at 100% 50%, transparent 8px, var(--tw-gradient-stops))",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,0.03), 0 4px 6px -1px rgba(15,23,42,0.05), 0 10px 15px -3px rgba(15,23,42,0.03)",
        premium: "0 10px 25px -5px rgba(30,96,213,0.1), 0 8px 10px -6px rgba(30,96,213,0.05)",
      },
    },
  },
  plugins: [],
};
