/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#0B3946',
          800: '#0F4C5C',
          700: '#146C7E',
          600: '#1A8A9E',
        },
      },
      fontFamily: {
        sans: ['"Microsoft YaHei"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
