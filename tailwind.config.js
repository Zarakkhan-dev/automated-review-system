module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
        },
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}