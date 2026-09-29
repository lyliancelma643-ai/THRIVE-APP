// Page de repli hors-ligne servie par le service worker quand une navigation
// échoue sans réseau (fallback Serwist). Statique : précachée à l'install.
import { Icon } from '@/components/ui';

export const metadata = { title: 'THRIVE — Hors ligne' };

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-cream px-6 text-center">
<span aria-hidden className="w-16 h-16 mb-5 rounded-2xl bg-navy-600 text-sun grid place-items-center shadow-card">
        <Icon name="refresh" className="w-8 h-8" />
      </span>
      <h1 className="font-display text-[28px] font-semibold text-navy-900 mb-2 text-balance">Pas de connexion</h1>
      <p className="text-navy-700 mb-6 max-w-sm text-pretty">
        Impossible de joindre THRIVE pour le moment. Vérifie ta connexion —
        cette page se rechargera automatiquement dès le retour du réseau.
      </p>
      {/* Reload automatique au retour du réseau + bouton manuel */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.addEventListener('online',function(){location.reload()});`,
        }}
      />
      {/* <a> volontaire (pas <Link>) : hors-ligne, on veut une navigation
          pleine page qui retente vraiment le réseau, pas le routeur client. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="inline-flex items-center min-h-[48px] rounded-full bg-navy-600 px-6 text-white font-bold shadow-card hover:bg-navy-700 transition-colors"
      >
        Réessayer
      </a>
    </main>
  );
}
