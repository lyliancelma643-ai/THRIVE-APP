import type { GalleryScreen } from './types';
import { screens as arrivee } from './lot-arrivee';
import { screens as maison } from './lot-maison';
import { screens as bilan } from './lot-bilan';
import { screens as parcours } from './lot-parcours';
import { screens as offres } from './lot-offres';

export type { GalleryScreen } from './types';
export const GALLERY: GalleryScreen[] = [...arrivee, ...maison, ...bilan, ...parcours, ...offres];
