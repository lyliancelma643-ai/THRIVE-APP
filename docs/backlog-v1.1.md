# Backlog v1.1

## Fonctionnalités vendues dans la matrice de packs mais non livrées (retirées de l'UI en v1.0)
Les colonnes/flags restent en base (`plans.features`, `plans.limits`, `lib/packs.ts`) ; seul l'affichage a été retiré (page `/parent/upgrade`).
- Export CSV / PDF du parcours (`csvExport`, `pdfExport`, pack Performance)
- Gabarits de rapport premium (`premiumTemplates`)
- Historique borné par pack (`historyMonths` : 3 / 12 / illimité) — non appliqué
- Stockage borné par pack (`storageMb`) — non appliqué
- Synthèse IA de fin de parcours (`aiSummary`) — aucune intégration LLM
- Rétrogradation / expiration automatique d'un pack (`sync_family_pack_from_entitlements`, mig. 038) — attribution manuelle uniquement

## Accès
- Décision produit à trancher : un pack programme (Groupe / Individuel / Complet) doit-il ouvrir Maison automatiquement ? (v1.0 : non, Maison = abonnement seul, comme en prod depuis 067b ; forçage admin possible.)
