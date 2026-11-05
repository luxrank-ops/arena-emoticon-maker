import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F8F9FA',
        paper: '#FFFFFF',
        ink: '#212121',
        sub: '#757575',
        line: '#E0E0E0',
        primary: '#7C4DFF',
        'primary-dark': '#5E35B1',
        cyber: '#1A237E',
        // Legacy semantic aliases keep existing flows consistent during the brand migration.
        coral: '#7C4DFF',
        coralink: '#5E35B1',
        mint: '#16865C',
        lilac: '#7C4DFF',
        lemon: '#EDE4FF',
        sky: '#9A83FF',
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
        card: '0 10px 28px -20px rgba(26,35,126,0.42)',
        pop: '0 24px 60px -24px rgba(26,35,126,0.42)',
        soft: '0 18px 40px -24px rgba(26,35,126,0.36)',
        cta: '0 8px 20px -12px rgba(124,77,255,0.75)',
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
      },
    },
  },
  plugins: [],
};
export default config;
