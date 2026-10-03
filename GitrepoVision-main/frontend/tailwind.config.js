/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        teal: {
          500: '#14b8a6',
          600: '#0d9488',
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)',
        'gradient-card': 'linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 100%)',
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}