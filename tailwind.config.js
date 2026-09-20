/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#f4f4f6',
          0: '#d9d9d9',
          1: '#fdfdfd',
          2: '#ffffff',
          3: '#f7f8fa',
          4: '#eef0f3',
        },
        line: {
          DEFAULT: '#eef0f1',
          strong: '#e0e2e6',
          subtle: '#f4f5f7',
        },
        fg: {
          DEFAULT: '#101014',
          muted: '#64748b',
          dim: '#a2a4a7',
          inverse: '#ffffff',
        },
        accent: {
          DEFAULT: '#9143d0',
          hover: '#8030c0',
          muted: '#f0e8fa',
          fg: '#ffffff',
        },
        win: {
          DEFAULT: '#39bd9a',
          muted: 'rgba(66,213,161,0.12)',
        },
        loss: {
          DEFAULT: '#d95d65',
          muted: 'rgba(242,79,84,0.10)',
        },
        be: {
          DEFAULT: '#a2a4a7',
          muted: 'rgba(162,164,167,0.12)',
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
        DEFAULT: '0.625rem',
        sm: '0.375rem',
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem',
        shell: '1.75rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        pop: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        shell: '0 4px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        input: '0 1px 2px rgba(0,0,0,0.04)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(3px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
