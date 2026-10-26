import { Easing } from 'react-native';
import { DUR, EASE, STAGGER, stagger } from '@thrive/shared';

type Bez = readonly [number, number, number, number];
const bez = (e: Bez) => Easing.bezier(e[0], e[1], e[2], e[3]);

/** Courbes des tokens de mouvement (packages/shared/src/motion/tokens.ts). */
export const ease = {
  out: bez(EASE.out),
  in: bez(EASE.in),
  inOut: bez(EASE.inOut),
  spring: bez(EASE.spring),
  hop: Easing.bezier(0.34, 1.3, 0.5, 1),
};

export { DUR, STAGGER, stagger };
