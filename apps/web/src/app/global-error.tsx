'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Filet de dernier recours : erreurs de rendu du layout racine lui-même
// (error.tsx ne les attrape pas). Doit rendre ses propres <html>/<body>.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F5F2',
          color: '#022539',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Oups, quelque chose s&apos;est mal passé
        </h1>
        <p style={{ color: '#3c4a52', maxWidth: 380, marginBottom: 24, lineHeight: 1.5 }}>
          Une erreur inattendue est survenue. Recharge la page — si le problème
          persiste, contacte l&apos;équipe THRIVE.
        </p>
        {error.digest && (
          <p style={{ fontSize: 12, color: '#5b6a73', marginBottom: 16 }}>
            Code : {error.digest}
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            borderRadius: 999,
            minHeight: 48,
            background: '#004E7A',
            color: '#fff',
            fontWeight: 600,
            padding: '12px 24px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Recharger
        </button>
      </body>
    </html>
  );
}
