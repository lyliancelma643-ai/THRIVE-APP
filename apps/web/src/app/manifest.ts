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
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Version « maskable » : glyphe réduit dans la zone sûre (80 %) sur fond navy
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
