import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './pages/**/*.{js,jsx}', './components/**/*.{js,jsx}', './App.jsx'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E8724A',
          light: '#F4A261',
          dark: '#D45A30',
        },
        secondary: {
          DEFAULT: '#2D6A4F',
          light: '#40916C',
          dark: '#1B4332',
        },
        accent: {
          DEFAULT: '#F4A261',
          light: '#F9C784',
        },
        warm: {
          DEFAULT: '#FFF8F0',
          dark: '#FFE8D6',
        },
        dark: '#1B1B2F',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 12px 24px -8px rgba(0, 0, 0, 0.1)',
        'button': '0 4px 8px rgba(232, 114, 74, 0.3)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;