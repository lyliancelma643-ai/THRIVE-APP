import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'THRIVE — Plateforme psychoéducative',
  description: 'Plateforme de suivi et d\'intervention psychoéducative par le sport pour les jeunes 8-17 ans',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable} font-sans`}>
      <body className="bg-cream text-navy-900 antialiased selection:bg-navy-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
