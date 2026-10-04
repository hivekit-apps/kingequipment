import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0F172A',
        },
        brand: {
          orange: '#C2410C',
          'orange-dark': '#9A3412',
        },
      },
      fontSize: {
        base: ['16px', '1.6'],
      },
    },
  },
  plugins: [],
};

export default config;
