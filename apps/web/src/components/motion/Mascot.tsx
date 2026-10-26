export type MascotPose = 'assise' | 'marche' | 'fiere';

/** Les images `public/mascotte/{pose}.webp` ne sont pas encore livrées : passer à `true` une fois déposées. */
export const MASCOT_IMAGES_READY = false;

/** Visage de repli, à poser dans un <svg> (centré en 0,0, rayon r) : disque soleil, deux yeux. */
export function MascotFace({ r = 14, day = false }: { r?: number; day?: boolean }) {
  return (
    <g>
      <circle r={r} className="fill-accent" stroke={day ? 'var(--text)' : 'none'} strokeWidth={day ? 2 : 0} />
      <ellipse cx={-r * 0.28} cy={-r * 0.08} rx={r * 0.13} ry={r * 0.2} fill="var(--on-accent)" />
      <ellipse cx={r * 0.28} cy={-r * 0.08} rx={r * 0.13} ry={r * 0.2} fill="var(--on-accent)" />
    </g>
  );
}

/** Mascotte seule (décorative). */
export function Mascot({ size = 28, pose = 'marche' }: { size?: number; pose?: MascotPose }) {
  if (MASCOT_IMAGES_READY) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/mascotte/${pose}.webp`} width={size} height={size} alt="" aria-hidden />;
  }
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`} aria-hidden>
      <MascotFace r={r - 1} />
    </svg>
  );
}
