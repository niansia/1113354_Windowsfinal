/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fusion: {
          bg: '#020617',
          window: 'rgba(15, 23, 42, 0.85)',
          accent: '#22d3ee',
          fuchsia: '#c026d3',
          indigo: '#6366f1',
        }
      }
    },
  },
  plugins: [],
}
