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
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36a9f7',
          500: '#0c8de9',
          600: '#016fc7',
          700: '#0258a1',
          800: '#064b85',
          900: '#0a3f6f',
          950: '#07284a',
        }
      }
    },
  },
  plugins: [],
}
