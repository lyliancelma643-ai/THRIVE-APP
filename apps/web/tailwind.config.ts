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
        // Espace parent — les deux ambiances du design « Tour 3 » (Nuit calme et
        // Jour clair) partagent ce vocabulaire. Chaque nom pointe sur une
        // variable CSS définie dans globals.css : `bg-night-surface` rend une
        // carte #0C2029 la nuit et #FFFFFF le jour, sans toucher au balisage.
        night: {
          bg: 'var(--bg)', // fond de page
          surface: 'var(--surface)', // cartes et rangées
          nav: 'var(--tab)', // barre d'onglets
          ink: 'var(--text)', // texte fort (titres, chiffres)
          body: 'var(--text2)', // texte courant
        },
        // Échelle de lisibilité : du plus contrasté au plus discret. Remplace
        // les `text-white/xx` (illisibles sur l'ambiance claire).
        ink: 'var(--text)',
        body: 'var(--text2)',
        soft: 'var(--text3)',
        faint: 'var(--text4)',
        meta: 'var(--meta)',
        'surface-sub': 'var(--surface-sub)',
        line: 'var(--line)',
        line2: 'var(--line2)',
        chip: 'var(--chip)',
        field: 'var(--field)',
        track: 'var(--track)',
        // Accents dépendants de l'ambiance : `accent` reste le jaune d'action,
        // `accent-ink` est sa déclinaison lisible en texte (marine le jour).
        accent: {
          DEFAULT: 'var(--accent)',
          ink: 'var(--accent-ink)',
          on: 'var(--on-accent)',
          line: 'var(--accent-line)',
        },
        brand: 'var(--brand)',
        sun: {
          DEFAULT: '#F9EB50',
          dark: '#E0D232',
        },
        sage: {
          light: '#C9DCD6',
          DEFAULT: '#A7C4BC',
          dark: '#7FA197',
        },
        // Couleurs sémantiques — alias iso-valeur des tons Tailwind déjà employés
        // dans l'app (Badge, boutons danger, pastilles d'état). Centralisées ici
        // pour harmoniser succès/alerte/erreur sans changer le rendu existant.
        success: { light: '#DCFCE7', DEFAULT: '#16A34A', dark: '#15803D' },
        warning: { light: '#FEF3C7', DEFAULT: '#D97706', dark: '#B45309' },
        danger: { light: '#FEE2E2', DEFAULT: '#DC2626', dark: '#B91C1C' },
      },
      borderRadius: {
        // Rayon des champs de saisie (aligne input-auth : 0.85rem)
        field: '0.85rem',
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
