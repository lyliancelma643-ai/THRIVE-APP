import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'THRIVE Sport Positive',
    short_name: 'THRIVE',
    description:
      "Protocole premium de développement global de l'enfant par le sport — 13 séances, coachs et familles connectés.",
    // Les utilisateurs déjà connectés retombent dans leur espace ; sinon /login.
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'fr',
    categories: ['sports', 'education', 'health'],
    background_color: '#F7F5F2',
    theme_color: '#022539',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
