// Page de repli hors-ligne servie par le service worker quand une navigation
// échoue sans réseau (fallback Serwist). Statique : précachée à l'install.
export const metadata = { title: 'THRIVE — Hors ligne' };

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 text-center">
      <p className="text-5xl mb-4" aria-hidden>
        📡
      </p>
      <h1 className="text-2xl font-bold text-navy-800 mb-2">Pas de connexion</h1>
      <p className="text-navy-600 mb-6 max-w-sm">
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
        className="rounded-xl bg-navy-600 px-6 py-3 text-white font-semibold shadow-card hover:bg-navy-700 transition-colors"
      >
        Réessayer
      </a>
    </main>
  );
}
