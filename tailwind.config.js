/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surface scale — dark-first
        bg: {
          DEFAULT: '#0A0A0B',
          0: '#0A0A0B',     // page
          1: '#101013',     // sidebar
          2: '#15151A',     // card
          3: '#1C1C22',     // card hover
          4: '#25252D',     // input / elevated
        },
        line: {
          DEFAULT: '#26262E',
          strong: '#34343E',
          subtle: '#1D1D24',
        },
        // Foreground scale
        fg: {
          DEFAULT: '#E6E6EA',
          muted: '#9A9AA6',
          dim: '#6B6B78',
          inverse: '#0A0A0B',
        },
        // Single accent — amber/orange
        accent: {
          DEFAULT: '#F59E0B',
          hover: '#FBB23A',
          muted: '#78350F',
          fg: '#1A1100',
        },
        // Semantic
        win: {
          DEFAULT: '#10B981',
          muted: 'rgba(16,185,129,0.12)',
        },
        loss: {
          DEFAULT: '#F43F5E',
          muted: 'rgba(244,63,94,0.12)',
        },
        be: {
          DEFAULT: '#9A9AA6',
          muted: 'rgba(154,154,166,0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.02) inset, 0 1px 2px rgba(0,0,0,0.4)',
        pop: '0 8px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
