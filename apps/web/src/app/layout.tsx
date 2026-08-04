import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { AccountSync } from '@/components/AccountSync';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#022539',
};

export const metadata: Metadata = {
  title: 'THRIVE — Plateforme psychoéducative',
  description: 'Plateforme de suivi et d\'intervention psychoéducative par le sport pour les jeunes 8-17 ans',
  applicationName: 'THRIVE',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'THRIVE',
  },
  formatDetection: { telephone: false },
  // Icônes servies par les fichiers conventionnels src/app/icon.png,
  // apple-icon.png et opengraph-image.png (liens générés par Next).
};

// Ambiance appliquée AVANT le premier rendu : sans ce script, un parent réglé
// sur « Jour clair » verrait un éclair de nuit le temps que React s'hydrate.
// Volontairement minuscule, sans dépendance, et sans jamais échouer bruyamment.
const AMBIANCE_BOOT = `(function(){try{var s=localStorage.getItem('thrive-ambiance');var a=s?JSON.parse(s).state.ambiance:'night';document.documentElement.dataset.theme=(a==='day'?'day':'night');}catch(e){document.documentElement.dataset.theme='night';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      data-theme="night"
      // Le script d'amorçage ci-dessous corrige data-theme AVANT l'hydratation :
      // React doit accepter cet écart plutôt que de le signaler comme un bug.
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} font-sans`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: AMBIANCE_BOOT }} />
      </head>
      <body className="bg-cream text-navy-900 antialiased selection:bg-navy-600 selection:text-white">
        <Providers>
          <AccountSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
