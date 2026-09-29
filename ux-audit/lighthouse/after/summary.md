# Lighthouse — after

Backend simulé local (latence réseau nulle côté données) ; mobile = émulation Moto G Power, CPU ×4, 4G lente.
INP n'est pas mesurable en navigation Lighthouse : le TBT (temps de blocage) sert d'indicateur de laboratoire.

| Écran | Format | Perf | Accessibilité | Bonnes pratiques | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| connexion | mobile | 87 | 100 | 100 | 1.06 s | 3.49 s | 0.000 | 239 ms |
| connexion | desktop | 100 | 100 | 100 | 0.21 s | 0.29 s | 0.000 | 35 ms |
| parent-bilan | mobile | 54 | 100 | 100 | 1.08 s | 7.39 s | 0.000 | 981 ms |
| parent-bilan | desktop | 100 | 100 | 100 | 0.19 s | 0.62 s | 0.005 | 34 ms |
| parent-maison | mobile | 88 | 100 | 100 | 0.63 s | 1.92 s | 0.000 | 472 ms |
| parent-maison | desktop | 100 | 100 | 100 | 0.20 s | 0.60 s | 0.000 | 53 ms |
| parent-mes-seances | mobile | 89 | 100 | 100 | 0.62 s | 1.72 s | 0.000 | 427 ms |
| parent-mes-seances | desktop | 100 | 98 | 100 | 0.19 s | 0.58 s | 0.005 | 24 ms |
| parent-seances-video | mobile | 82 | 100 | 100 | 0.63 s | 1.82 s | 0.000 | 703 ms |
| parent-seances-video | desktop | 100 | 100 | 100 | 0.20 s | 0.59 s | 0.005 | 36 ms |
| coach-tableau-de-bord | mobile | 77 | 100 | 100 | 1.07 s | 4.74 s | 0.063 | 269 ms |
| coach-tableau-de-bord | desktop | 99 | 100 | 100 | 0.18 s | 0.52 s | 0.067 | 37 ms |
| admin-dashboard | mobile | 65 | 100 | 100 | 1.07 s | 5.39 s | 0.125 | 451 ms |
| admin-dashboard | desktop | 100 | 100 | 100 | 0.19 s | 0.50 s | 0.033 | 29 ms |
