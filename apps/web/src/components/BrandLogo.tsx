'use client';

import { useState } from 'react';

// Logo officiel THRIVE : version vectorielle /logo.svg (présente dans
// apps/web/public/). On part directement sur le SVG pour éviter le flash de
// logo cassé : /logo.png n'est pas livré (404). Si un /logo.png officiel est
// déposé plus tard, repasser src initial à '/logo.png' (le SVG reste le repli).
export function BrandLogo({ className = 'h-8 w-auto' }: { className?: string }) {
  const [src, setSrc] = useState('/logo.svg');
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
