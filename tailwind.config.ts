import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF8FF',
        paper: '#FFFFFF',
        ink: '#17102B',
        sub: '#6C6580',
        line: '#ECE6F7',
        primary: '#6E29F5',
        'primary-dark': '#521FCC',
        cyber: '#150C2B',
        // Legacy semantic aliases keep existing flows consistent during the brand migration.
        // (coral/lilac now resolve to the studio violet so every screen shares one accent.)
        coral: '#6E29F5',
        coralink: '#521FCC',
        mint: '#0E9F6E',
        lilac: '#A78BFA',
        lemon: '#EDE4FF',
        sky: '#8B7BF7',
        // 2026 sticker-studio accents used in gradients and stamps.
        hot: '#FF4D8D',
        apricot: '#FF9F5A',
        grape: '#2A1E45',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,16,43,0.04), 0 14px 30px -22px rgba(53,25,120,0.28)',
        pop: '0 2px 6px rgba(23,16,43,0.05), 0 26px 54px -26px rgba(53,25,120,0.38)',
        soft: '0 20px 44px -26px rgba(53,25,120,0.30)',
        cta: '0 12px 26px -12px rgba(110,41,245,0.55)',
        glow: '0 22px 60px -28px rgba(255,77,141,0.45), 0 10px 30px -24px rgba(110,41,245,0.55)',
        sticker: '0 3px 8px rgba(23,16,43,0.06), 0 26px 60px -30px rgba(53,25,120,0.55)',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pop: { '0%': { transform: 'scale(.92)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'step-left': { '0%': { transform: 'translateX(28px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'step-right': { '0%': { transform: 'translateX(-28px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'fade-scale': { '0%': { transform: 'scale(.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'grid-in': { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'sheet-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        'tip-fade': { '0%': { transform: 'translateY(4px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'scan-y': { '0%,100%': { transform: 'translateY(-18px)', opacity: '.45' }, '50%': { transform: 'translateY(24px)', opacity: '1' } },
        'float-slow': { '0%,100%': { transform: 'translateY(0) rotate(var(--tw-rotate, 0deg))' }, '50%': { transform: 'translateY(-10px) rotate(var(--tw-rotate, 0deg))' } },
      },
      animation: {
        floaty: 'floaty 4s ease-in-out infinite',
        pop: 'pop .25s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        'step-left': 'step-left .3s cubic-bezier(0.22,1,0.36,1) both',
        'step-right': 'step-right .3s cubic-bezier(0.22,1,0.36,1) both',
        'fade-scale': 'fade-scale .4s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in .2s ease-out both',
        'grid-in': 'grid-in .3s cubic-bezier(0.22,1,0.36,1) both',
        'sheet-up': 'sheet-up .25s cubic-bezier(0.22,1,0.36,1) both',
        'tip-fade': 'tip-fade .3s ease-out both',
        'scan-y': 'scan-y 2.2s ease-in-out infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
