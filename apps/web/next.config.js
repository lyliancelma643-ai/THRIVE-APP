/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // La zone parent s'ouvre sur le Bilan (onglet Résumé, façon Apple Forme)
      { source: '/parent', destination: '/parent/bilans', permanent: false },
      // Bibliothèque fusionnée dans l'onglet Fitness ; ancienne page Progrès retirée
      { source: '/parent/library', destination: '/parent/fitness', permanent: false },
      { source: '/parent/progress', destination: '/parent/bilans', permanent: false },
    ];
  },
};

module.exports = nextConfig;
