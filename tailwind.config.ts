import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  darkMode: 'class',

  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'SF Pro Thai',
          'Inter',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      colors: {
        dark: {
          bg: '#000000', // Black
          surface: '#111111', // Very dark gray
          border: '#333333', // Dark gray
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      }
    }
  },

  plugins: []
} as Config;
