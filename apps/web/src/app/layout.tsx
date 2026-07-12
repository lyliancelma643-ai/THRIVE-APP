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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable} font-sans`}>
      <body className="bg-cream text-navy-900 antialiased selection:bg-navy-600 selection:text-white">
        <Providers>
          <AccountSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
