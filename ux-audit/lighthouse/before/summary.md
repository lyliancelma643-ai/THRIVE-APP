# Lighthouse — before

Backend simulé local (latence réseau nulle côté données) ; mobile = émulation Moto G Power, CPU ×4, 4G lente.
INP n'est pas mesurable en navigation Lighthouse : le TBT (temps de blocage) sert d'indicateur de laboratoire.

| Écran | Format | Perf | Accessibilité | Bonnes pratiques | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| connexion | mobile | 84 | 96 | 100 | 1.07 s | 3.83 s | 0.000 | 240 ms |
| connexion | desktop | 100 | 96 | 100 | 0.21 s | 0.34 s | 0.000 | 28 ms |
| parent-bilan | mobile | 65 | 100 | 100 | 1.07 s | 7.07 s | 0.000 | 455 ms |
| parent-bilan | desktop | 100 | 100 | 100 | 0.18 s | 0.57 s | 0.005 | 34 ms |
| parent-maison | mobile | 88 | 100 | 100 | 0.68 s | 0.91 s | 0.000 | 472 ms |
| parent-maison | desktop | 100 | 100 | 100 | 0.18 s | 0.21 s | 0.000 | 48 ms |
| parent-mes-seances | mobile | 91 | 100 | 100 | 0.67 s | 0.72 s | 0.000 | 390 ms |
| parent-mes-seances | desktop | 100 | 98 | 100 | 0.19 s | 0.50 s | 0.005 | 33 ms |
| parent-seances-video | mobile | 83 | 100 | 100 | 0.64 s | 2.00 s | 0.000 | 662 ms |
| parent-seances-video | desktop | 100 | 100 | 100 | 0.20 s | 0.21 s | 0.005 | 19 ms |
| coach-tableau-de-bord | mobile | 53 | 96 | 100 | 1.07 s | 4.87 s | 0.409 | 426 ms |
| coach-tableau-de-bord | desktop | 96 | 96 | 100 | 0.19 s | 0.49 s | 0.116 | 26 ms |
| admin-dashboard | mobile | 69 | 96 | 100 | 1.07 s | 5.42 s | 0.118 | 326 ms |
| admin-dashboard | desktop | 100 | 96 | 100 | 0.18 s | 0.43 s | 0.052 | 26 ms |
