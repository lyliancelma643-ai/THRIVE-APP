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
      width={512}
      height={512}
      priority
      className={`rounded-[22%] object-cover ${className}`}
    />
  );
}
