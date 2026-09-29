# Lighthouse — before

Backend simulé local (latence réseau nulle côté données) ; mobile = émulation Moto G Power, CPU ×4, 4G lente.
Passes par mesure : 3 (médiane retenue).
INP n'est pas mesurable en navigation Lighthouse : le TBT (temps de blocage) sert d'indicateur de laboratoire.

| Écran | Format | Perf | Accessibilité | Bonnes pratiques | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| connexion | mobile | 90 | 96 | 100 | 0.73 s | 0.93 s | 0.000 | 396 ms |
| connexion | desktop | 100 | 96 | 100 | 0.21 s | 0.33 s | 0.000 | 30 ms |
| parent-bilan | mobile | 84 | 100 | 100 | 0.65 s | 2.32 s | 0.000 | 581 ms |
| parent-bilan | desktop | 100 | 100 | 100 | 0.19 s | 0.56 s | 0.005 | 26 ms |
| parent-maison | mobile | 89 | 100 | 100 | 0.67 s | 0.77 s | 0.000 | 434 ms |
| parent-maison | desktop | 100 | 100 | 100 | 0.19 s | 0.19 s | 0.000 | 22 ms |
| parent-mes-seances | mobile | 87 | 100 | 100 | 0.64 s | 0.68 s | 0.000 | 517 ms |
| parent-mes-seances | desktop | 100 | 98 | 100 | 0.18 s | 0.50 s | 0.005 | 18 ms |
| parent-seances-video | mobile | 82 | 100 | 100 | 0.72 s | 0.98 s | 0.000 | 727 ms |
| parent-seances-video | desktop | 100 | 100 | 100 | 0.20 s | 0.23 s | 0.005 | 19 ms |
| coach-tableau-de-bord | mobile | 66 | 96 | 100 | 0.63 s | 1.86 s | 0.409 | 552 ms |
| coach-tableau-de-bord | desktop | 96 | 96 | 100 | 0.18 s | 0.48 s | 0.116 | 28 ms |
| admin-dashboard | mobile | 83 | 96 | 100 | 0.64 s | 1.82 s | 0.118 | 494 ms |
| admin-dashboard | desktop | 100 | 96 | 100 | 0.19 s | 0.56 s | 0.052 | 32 ms |
