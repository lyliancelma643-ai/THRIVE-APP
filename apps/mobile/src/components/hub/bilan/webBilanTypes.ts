// Types seuls, pour le typage du gabarit web bilan-html.ts (`import type … from '@/lib/bilan'`) côté app :
// le module web complet utilise des API navigateur (window, crypto) absentes de React Native.
export type LsssMoment = 'BASELINE' | 'MID' | 'FINAL';
