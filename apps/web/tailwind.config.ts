import type { Config } from 'tailwindcss';

// Brand board THRIVE Sport Positive
// Bleu marine profond #004E7A — confiance, sérieux, expertise (dominante)
// Blanc cassé #F7F5F2 — clarté, espace, premium (fond)
// Jaune soleil #F9EB50 — énergie, optimisme, jeunesse (accent)
// Vert-bleu sage #A7C4BC — sérénité, croissance, bien-être (secondaire)
const config: Config = {
  // Mode sombre par classe (opt-in par page — utilisé par la roadmap admin)
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#E8F1F7',
          100: '#CBE0EE',
          200: '#9CC4DD',
          300: '#67A4C9',
          400: '#3380AC',
          500: '#0E6593',
          600: '#004E7A',
          700: '#004063',
          800: '#00314C',
          900: '#022539',
        },
        cream: '#F7F5F2',
        sun: {
          DEFAULT: '#F9EB50',
          dark: '#E0D232',
        },
        sage: {
          light: '#C9DCD6',
          DEFAULT: '#A7C4BC',
          dark: '#7FA197',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 49, 76, 0.10)',
        'card-hover': '0 8px 32px rgba(0, 49, 76, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
