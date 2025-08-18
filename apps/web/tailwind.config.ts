import type { Config } from "tailwindcss"

const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem"
      },
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      colors: {
        "brand-bg": "#a7d3d6", // Teal/Aqua
        "brand-primary": "#4a3a2c", // Dark brown
        "brand-primary-hover": "#3a2c1e", // Slightly darker brown for hover
        "brand-accent": "#f15a29", // Orange dot
        "brand-border": "#e6e6e6", // Light gray
        "brand-text": "#4a3a2c", // Main text
        "brand-text-muted": "#7d6e5c" // Muted brown
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "blue-dot-pulse": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "70%": { transform: "scale(2.5)", opacity: "0" },
          "100%": { transform: "scale(2.5)", opacity: "0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "blue-dot-pulse": "blue-dot-pulse 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1)"
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji"
        ],
        serif: ["var(--font-serif)", "Georgia", "Cambria", "Times New Roman", "Times", "serif"]
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config

export default config
