import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Legacy fort-* tokens (used by marketing/ui components)
        fort: {
          bg:      '#090b0d',
          surface: '#0d1014',
          card:    '#111518',
          border:  '#1c2229',
          cyan:    '#217eaa',
          muted:   '#8ca4ac',
          text:    '#eeeeee',
          green:   '#22c55e',
          danger:  '#ef4444',
          warning: '#f59e0b',
          orange:  '#f97316',
        },
        // FortiChain design system — matches reference screenshots
        fc: {
          bg:       '#090b0d',   // darkest bg
          surface:  '#0d1014',   // panel/sidebar bg
          card:     '#111518',   // card bg
          card2:    '#141a1f',   // elevated card
          border:   '#1c2229',   // border
          border2:  '#232b34',   // brighter border
          // User palette
          primary:  '#217eaa',   // main CTA blue
          blue:     '#7d9cb7',   // secondary blue
          muted:    '#8ca4ac',   // muted text
          text:     '#eeeeee',   // primary text
          light:    '#f2f2f3',   // light text
          // Status colors
          green:    '#22c55e',   // live/success
          amber:    '#f59e0b',   // warning
          red:      '#ef4444',   // danger/critical
          orange:   '#f97316',   // high risk
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      letterSpacing: {
        widest2: '0.2em',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(200%)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
