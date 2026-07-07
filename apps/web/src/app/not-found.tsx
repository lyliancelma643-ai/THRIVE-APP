import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 text-center">
      <p className="text-5xl mb-4" aria-hidden>
        🧭
      </p>
      <h1 className="text-2xl font-bold text-navy-800 mb-2">Page introuvable</h1>
      <p className="text-navy-600 mb-6 max-w-sm">
        La page que tu cherches n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-navy-600 px-6 py-3 text-white font-semibold shadow-card hover:bg-navy-700 transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
