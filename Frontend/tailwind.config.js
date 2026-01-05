/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          light: '#5eead4', // light cyan
          DEFAULT: '#06b6d4', // primary cyan
          dark: '#0e7490', // deep teal
        },
        sand: '#fcd34d', // accent yellow
      },
      backgroundImage: {
        'ocean-gradient': 'linear-gradient(to right, #0891b2, #0d9488, #2563eb)',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
      animation: {
        slideDown: 'slideDown 0.3s ease-out',
        fadeIn: 'fadeIn 0.5s ease-in-out',
        pulseGlow: 'pulseGlow 2s infinite ease-in-out',
      },
      boxShadow: {
        glow: '0 0 20px rgba(6, 182, 212, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
