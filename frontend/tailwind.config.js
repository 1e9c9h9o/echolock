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
        // Utilitarian + Kruger-inspired palette
        echo: '#C73E3A',        // Red - urgent, direct
        lock: '#2D8B3C',        // Green - active state
        accent: '#000000',      // Black - bold statements

        primary: '#000000',     // Black for primary actions
        secondary: '#FFFFFF',   // White for contrast
        success: '#2D8B3C',     // Green
        warning: '#C73E3A',     // Red
        background: '#FFFFFF',
        surface: '#F0F0F0',     // Light gray
        border: '#000000',      // Black borders
        text: {
          primary: '#000000',
          secondary: '#666666',
          inverse: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Courier New', 'Courier', 'monospace'],
      },
      fontSize: {
        'civic': ['14px', '1.4'],
        'statement': ['24px', '1.2'],
      },
    },
  },
  plugins: [],
}
