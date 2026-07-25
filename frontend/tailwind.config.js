/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36a9f7',
          500: '#0c8de4',
          600: '#0270c1',
          700: '#03599d',
          800: '#074c81',
          900: '#0c3f6c',
          950: '#082847',
        },
        steel: {
          50: '#f6f7f9',
          100: '#ebedf1',
          200: '#d2d7e0',
          300: '#acb5c6',
          400: '#7e8ca6',
          500: '#5c6c89',
          600: '#485570',
          700: '#3b455c',
          800: '#333b4e',
          900: '#2d3342',
          950: '#1b1e28'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
