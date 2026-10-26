import type { CSSProperties, ElementType, ReactNode } from 'react';

/** Arrivée du contenu (« rise ») : opacité 0→1 et 10 px→0 en 300 ms ; `delay` en ms. `skip` : déjà en place. */
export function Rise({ delay = 0, skip, as: Tag = 'div', className = '', style, children }: { delay?: number; skip?: boolean; as?: ElementType; className?: string; style?: CSSProperties; children: ReactNode }) {
  if (skip) return <Tag className={className} style={style}>{children}</Tag>;
  return (
    <Tag className={`animate-rise ${className}`} style={{ animationDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  );
}
