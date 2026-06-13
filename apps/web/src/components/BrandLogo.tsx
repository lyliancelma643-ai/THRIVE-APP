'use client';

import { useState } from 'react';

// Logo officiel THRIVE : utilise /logo.png (fichier original) s'il est présent
// dans apps/web/public/, sinon la version vectorielle recréée /logo.svg.
export function BrandLogo({ className = 'h-8 w-auto' }: { className?: string }) {
  const [src, setSrc] = useState('/logo.png');
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="THRIVE Sport Positive"
      className={className}
      onError={() => {
        if (src !== '/logo.svg') setSrc('/logo.svg');
      }}
    />
  );
}
