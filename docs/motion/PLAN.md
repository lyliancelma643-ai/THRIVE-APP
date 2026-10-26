# Plan — système de mouvement et de chargement

Audit fait avant de coder (branche `feat/motion-system`, créée depuis la branche TestFlight).

## Ce qui existe déjà
- Web : tokens `--ease-*` / `--dur-*`, `Skeleton` en `animate-pulse`, `TabPager` (trois onglets gardés montés, glissement 520 ms), `animate-om-up`, compteur de fin déjà animé dans `ActivityMode`, états de chargement inline.
- Mobile : RN `Animated` partout (kit `design/web`), `Skeleton`, `LoadRetry`/`useStall` (livrés au build 12), flot d'activité piloté par un réducteur (`flow.ts`), `SealPanel`, `EndView`, `Sheet`.
- `@thrive/shared` compilé en `dist` pour le web ; le mobile le lit en sources.
- Aucune dépendance à ajouter : Reanimated est installé mais le code existant utilise `Animated` ; on reste dessus.

## Où chaque pièce est branchée
| Pièce | Web | Mobile |
|---|---|---|
| Tokens, `useDelayedFlag`, `useLoadStages`, petits textes | `packages/shared` | idem |
| `StairLoader` ouverture | (non branché : pas d'écran d'ouverture web) | `MaisonFrame` → `OpeningGate` (1 fois par lancement) |
| `StairLoader` paiement | `abonnement/page.tsx` (retour de Checkout) | composant prêt, non branché (paiement hors app) |
| Squelette en vague | `Skeleton` + `PageSkeleton` | `kit.Skeleton`, Bilan, Séances, Maison (400 ms) |
| `HairlineRefresh` | composant prêt | `HubScreen` (relectures Séances et Bilan) |
| Cascade de la fiche | — | `Fiche.tsx` (`Rise`) |
| `SealLetter` | `ActivityMode` (lettre) | `SealPanel` |
| Fin d'activité | `Rise` sur la minute | `ClosingCount`, `Pop`, `PrideFade`, `UnlockRise` dans `EndView` |
| `BreathingBall` | `ActivityMode` (amorce) | `AmorceView` |
| `UploadProgress`, `ProgressRing`, `OdometerNumber` | composants prêts | idem (squelette du Bilan utilise l'anneau) |

## Risques
- Pas d'appareil réel sous la main : animations vérifiées sur le banc web (`/__ecran?e=MOT-…`), pas sur iPhone.
- Les tests unitaires couvrent les moteurs purs, pas le rendu.
- L'escalier d'ouverture ne s'affiche que si le chargement dépasse 400 ms.
