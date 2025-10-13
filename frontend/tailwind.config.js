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
        // EchoLock brand colors from logo
        echo: '#C73E3A',        // Red from ECHO
        lock: '#2D8B3C',        // Green from LOCK
        accent: '#2B7B9E',      // Blue accent

        // Functional colors
        primary: '#2B7B9E',     // Blue for primary actions
        secondary: '#333333',   // Dark gray for text
        success: '#2D8B3C',     // Green for success states
        warning: '#C73E3A',     // Red for warnings/alerts
        background: '#FFFFFF',  // Pure white
        surface: '#F5F5F5',     // Light gray for surfaces
        border: '#CCCCCC',      // Border gray
        text: {
          primary: '#333333',
          secondary: '#666666',
          disabled: '#999999',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Courier New', 'monospace'],
      },
      spacing: {
        // Grid-based spacing (8px base)
        'grid': '8px',
        'grid-2': '16px',
        'grid-3': '24px',
        'grid-4': '32px',
        'grid-5': '40px',
        'grid-6': '48px',
      },
    },
  },
  plugins: [],
}
