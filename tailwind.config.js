/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', hover: '#1D4ED8', soft: '#EFF6FF', ring: '#93C5FD' },
        navy: { DEFAULT: '#0B1F3A', sidebar: '#102B4E', hover: '#173A66' },
        canvas: '#F7FAFE',
        ink: { DEFAULT: '#172B4D', muted: '#64748B', faint: '#94A3B8' },
        line: '#E2EAF3',
        review: { DEFAULT: '#D97706', soft: '#FEF3C7', ink: '#92400E' },
        urgent: { DEFAULT: '#DC2626', soft: '#FEE2E2', ink: '#991B1B' },
        ok: { DEFAULT: '#047857', soft: '#D1FAE5' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: { card: '14px' },
      boxShadow: {
        card: '0 1px 2px rgba(16, 43, 78, 0.04), 0 2px 8px rgba(16, 43, 78, 0.05)',
        pop: '0 10px 30px rgba(11, 31, 58, 0.16)',
      },
    },
  },
  plugins: [],
};
