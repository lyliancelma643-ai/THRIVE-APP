import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'THRIVE Sport Positive',
    short_name: 'THRIVE',
    description:
      "Protocole premium de développement global de l'enfant par le sport — 13 séances, coachs et familles connectés.",
    start_url: '/login',
    display: 'standalone',
    background_color: '#F7F5F2',
    theme_color: '#022539',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
