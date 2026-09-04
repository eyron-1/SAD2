/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        civic: {
          navy: '#0F2D4A',
          slate: '#1E4258',
          gold: '#C9A24B',
          leaf: '#2F6B4F',
          cream: '#F7F4EC',
          clay: '#B4472B',
          emerald: '#2F6B4F',
          dark: '#0F2D4A',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15, 45, 74, 0.08)',
        'glow': '0 0 20px rgba(13, 148, 136, 0.15)',
        'card-hover': '0 12px 24px -4px rgba(15, 45, 74, 0.12)',
      },
    },
  },
  plugins: [],
};

