import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#E8EEF7',
          100: '#C5D4E9',
          200: '#8FAAD3',
          500: '#2B5BA8',
          700: '#1B3A6B',
          900: '#0D1D35',
        },
        gold: {
          50: '#FDF5E6',
          100: '#F9E4B8',
          200: '#F3CC82',
          500: '#C8973A',
          700: '#8F6420',
          900: '#4A3110',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
