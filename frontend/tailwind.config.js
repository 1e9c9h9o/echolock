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
        // echolock.xyz risograph palette
        cream: '#FDF9F0',
        'cream-dark': '#F5EFE0',
        blue: '#0045D3',
        red: '#FF4D00',
        black: '#212121',
        white: '#FFFFFF',

        // Additional colors for security indicators
        green: '#00C853',
        yellow: '#FFD600',
        purple: '#7B1FA2',

        // Semantic
        primary: '#0045D3',
        danger: '#FF4D00',
        background: '#FDF9F0',
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
        heading: ['Syne', 'sans-serif'],
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
