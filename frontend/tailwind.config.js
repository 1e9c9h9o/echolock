/** @type {import('tailwindcss').Config} */
module.exports = {
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
        blue: '#0045D3',
        red: '#FF4D00',
        black: '#212121',
        white: '#FFFFFF',

        // Semantic
        primary: '#0045D3',
        danger: '#FF4D00',
        background: '#FDF9F0',
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      fontSize: {
        base: ['18px', '1.6'],
      },
    },
  },
  plugins: [],
}
