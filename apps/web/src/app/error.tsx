'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Icon } from '@/components/ui';
import { isStaleBuildError, reloadOnceForNewBuild } from '@/lib/stale-build';

// Page d'erreur globale (App Router) — attrape les exceptions de rendu
// des Server/Client Components et offre une relance sans rechargement dur.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const staleBuild = isStaleBuildError(error);

  useEffect(() => {
    // Nouvelle version en ligne : on la charge plutôt que d'afficher une erreur.
    if (staleBuild && reloadOnceForNewBuild()) return;
    Sentry.captureException(error);
  }, [error, staleBuild]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-cream px-6 text-center">
<span aria-hidden className="w-16 h-16 mb-5 rounded-2xl bg-navy-600 text-sun grid place-items-center shadow-card">
        <Icon name="refresh" className="w-8 h-8" />
      </span>
      <h1 className="font-display text-[28px] font-semibold text-navy-900 mb-2 text-balance">
        Oups, quelque chose s&apos;est mal passé
      </h1>
      <p className="text-navy-700 mb-6 max-w-sm text-pretty">
        Une erreur inattendue est survenue. Réessaie — si le problème persiste,
        contacte l&apos;équipe THRIVE.
      </p>
      {error.digest && (
        <p className="text-xs text-navy-600 mb-4 tabular-nums">Code : {error.digest}</p>
      )}
      <button
        onClick={() => (staleBuild ? window.location.reload() : reset())}
        className="inline-flex items-center min-h-[48px] rounded-full bg-navy-600 px-6 text-white font-bold shadow-card hover:bg-navy-700 transition-colors"
      >
        Réessayer
      </button>
    </main>
  );
}
