/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Hacienda industrial palette
        blue: '#7BA3C9',
        'blue-light': '#A8C5DC',
        'blue-dark': '#5B8BB8',
        orange: '#FF6B00',
        yellow: '#FFD000',
        black: '#0A0A0A',
        'hazard-black': '#1A1A1A',
        white: '#FFFFFF',

        // Semantic
        primary: '#FF6B00',
        danger: '#FF6B00',
        background: '#7BA3C9',
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        heading: ['IBM Plex Sans', 'sans-serif'],
      },
      fontSize: {
        base: ['18px', '1.6'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-rtl'),
    // Custom RTL utilities
    function ({ addUtilities }) {
      addUtilities({
        '.flip-rtl': {
          '[dir="rtl"] &': {
            transform: 'scaleX(-1)',
          },
        },
        '.text-start': {
          'text-align': 'start',
        },
        '.text-end': {
          'text-align': 'end',
        },
      });
    },
  ],
}
