/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        teal: {
          50: '#f0fdf9',
          500: '#14b8a6', // For specific focus rings
          600: '#00bfa5', // Brand Teal
          700: '#00a891',
        },
        emerald: {
          50: '#ecfdf5',
          700: '#065f46',
        },
        amber: {
          50: '#fffbeb',
          700: '#b45309',
        },
        red: {
          50: '#fef2f2',
          700: '#b91c1c',
        },
      },
    },
  },
  plugins: [],
}
