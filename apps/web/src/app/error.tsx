'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Page d'erreur globale (App Router) — attrape les exceptions de rendu
// des Server/Client Components et offre une relance sans rechargement dur.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 text-center">
      <p className="text-5xl mb-4" aria-hidden>
        😵
      </p>
      <h1 className="text-2xl font-bold text-navy-800 mb-2">
        Oups, quelque chose s&apos;est mal passé
      </h1>
      <p className="text-navy-600 mb-6 max-w-sm">
        Une erreur inattendue est survenue. Réessaie — si le problème persiste,
        contacte l&apos;équipe THRIVE.
      </p>
      {error.digest && (
        <p className="text-xs text-navy-400 mb-4">Code : {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-xl bg-navy-600 px-6 py-3 text-white font-semibold shadow-card hover:bg-navy-700 transition-colors"
      >
        Réessayer
      </button>
    </main>
  );
}
