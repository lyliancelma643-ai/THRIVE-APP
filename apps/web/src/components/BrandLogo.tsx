import Image from 'next/image';

// Logo officiel THRIVE : tuile carrée navy-600 (#004E7A) + silhouette crème,
// déclinée depuis assets/images/logo.png (master 1024px) vers /logo.png (512px).
// Le rendu « app icon » (coins arrondis proportionnels) est appliqué ici pour
// être identique partout ; la taille se pilote via className (h-N w-N).
export function BrandLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="THRIVE Sport Positive"
      // Affiché de 28 à 80 px : une source de 160 px suffit (srcset 1x / 2x)
      // au lieu de 640 à 1 080 px téléchargés pour une vignette.
      width={160}
      height={160}
      priority
      className={`rounded-[22%] object-cover ${className}`}
    />
  );
}
