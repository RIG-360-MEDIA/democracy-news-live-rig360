import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ─────────────────────────────────
        surface: {
          base:    '#111010', // main app background
          raised:  '#1a1918', // cards, panels
          overlay: '#222120', // modals, dropdowns
          high:    '#2c2a28', // tooltips, highest elevation
        },
        // ── Borders ──────────────────────────────────
        border: {
          DEFAULT: '#2e2b29',
          subtle:  '#1e1c1a',
          strong:  '#3e3b38',
        },
        // ── Text ─────────────────────────────────────
        text: {
          primary:   '#f0ede8',
          secondary: '#9a9590',
          muted:     '#6b6560',
          disabled:  '#4a4744',
        },
        // ── Mode signatures ───────────────────────────
        minute: {
          DEFAULT: '#e0604a',
          dim:     '#a03828',
          bright:  '#f07058',
        },
        digest: {
          DEFAULT: '#4a9e62',
          dim:     '#2e6640',
          bright:  '#5ab872',
        },
        longread: {
          DEFAULT: '#5a8ab8',
          dim:     '#344e6e',
          bright:  '#7aaad8',
        },
        longview: {
          DEFAULT: '#c49040',
          dim:     '#7a5820',
          bright:  '#e4b060',
        },
        sides: {
          left:   '#6a8fd4',
          right:  '#d46a6a',
          center: '#9a9590',
        },
        // ── Studio CMS (RigWire Studio) — ivory/paper editorial chrome.
        //    ADDITIVE: reader tokens above are untouched. Studio UI reads
        //    ONLY these; accent is reserved for live/urgent/destructive.
        studio: {
          paper:  '#faf8f3', // page / surface
          ink:    '#141210', // primary text
          accent: '#7a1e22', // single dark-red accent
          rule:   '#e4e0d8', // hairline dividers, borders
          muted:  '#6b645c', // secondary text, meta
        },
      },

      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans:    ['var(--font-jakarta)',  'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },

      fontSize: {
        // Display — Fraunces editorial scale
        'd-2xl': ['4.5rem',    { lineHeight: '0.97',  letterSpacing: '-0.03em'  }],
        'd-xl':  ['3.75rem',   { lineHeight: '1.0',   letterSpacing: '-0.025em' }],
        'd-lg':  ['3rem',      { lineHeight: '1.03',  letterSpacing: '-0.022em' }],
        'd-md':  ['2.25rem',   { lineHeight: '1.07',  letterSpacing: '-0.018em' }],
        'd-sm':  ['1.875rem',  { lineHeight: '1.1',   letterSpacing: '-0.015em' }],
        'd-xs':  ['1.5rem',    { lineHeight: '1.15',  letterSpacing: '-0.012em' }],
        // Body — Jakarta readable scale
        'b-xl':  ['1.25rem',   { lineHeight: '1.78' }],
        'b-lg':  ['1.125rem',  { lineHeight: '1.75' }],
        'b-md':  ['1rem',      { lineHeight: '1.7'  }],
        'b-sm':  ['0.875rem',  { lineHeight: '1.65' }],
        // UI — compact functional
        'ui-lg': ['0.875rem',  { lineHeight: '1.4', letterSpacing: '0'     }],
        'ui-md': ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0'     }],
        'ui-sm': ['0.75rem',   { lineHeight: '1.4', letterSpacing: '0'     }],
        // Kicker — all-caps labels
        'kicker':['0.625rem',  { lineHeight: '1',   letterSpacing: '0.2em' }],
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },

      borderRadius: {
        'sm':  '6px',
        'md':  '10px',
        'lg':  '14px',
        'xl':  '18px',
        '2xl': '24px',
        '3xl': '32px',
      },

      boxShadow: {
        'sm': '0 1px 3px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.35)',
        'md': '0 4px 12px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.3)',
        'lg': '0 12px 32px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)',
        'xl': '0 24px 64px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.3)',
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      maxWidth: {
        'content': '680px',
        'wide':    '960px',
        'screen':  '1280px',
      },

      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)'    },
        },
      },

      animation: {
        'fade-up':  'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in':  'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;
