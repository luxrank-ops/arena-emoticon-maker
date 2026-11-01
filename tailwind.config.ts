import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF9F2',
        paper: '#FFFDFA',
        ink: '#191512',
        sub: '#6B615A',
        line: '#EADFD3',
        coral: '#FF6B5B',
        coralink: '#D93A2B',
        mint: '#0FB48A',
        lilac: '#7C6BFF',
        lemon: '#FFCF4D',
        sky: '#5AB8F5',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 2px 0 0 #191512',
        pop: '0 6px 0 0 #191512',
        soft: '0 18px 40px -24px rgba(25,21,18,0.45)',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pop: { '0%': { transform: 'scale(.92)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        floaty: 'floaty 4s ease-in-out infinite',
        pop: 'pop .25s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
export default config;
