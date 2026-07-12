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
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf6ef',
          color: '#022539',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <p style={{ fontSize: 48, marginBottom: 16 }} aria-hidden>
          😵
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Oups, quelque chose s&apos;est mal passé
        </h1>
        <p style={{ opacity: 0.7, maxWidth: 380, marginBottom: 24 }}>
          Une erreur inattendue est survenue. Recharge la page — si le problème
          persiste, contacte l&apos;équipe THRIVE.
        </p>
        {error.digest && (
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>
            Code : {error.digest}
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            borderRadius: 12,
            background: '#0b4f6c',
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
