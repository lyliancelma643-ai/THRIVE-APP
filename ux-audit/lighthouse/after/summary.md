# Lighthouse — after

Backend simulé local (latence réseau nulle côté données) ; mobile = émulation Moto G Power, CPU ×4, 4G lente.
Passes par mesure : 3 (médiane retenue).
INP n'est pas mesurable en navigation Lighthouse : le TBT (temps de blocage) sert d'indicateur de laboratoire.

| Écran | Format | Perf | Accessibilité | Bonnes pratiques | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| connexion | mobile | 87 | 100 | 100 | 0.75 s | 1.09 s | 0.000 | 523 ms |
| connexion | desktop | 100 | 100 | 100 | 0.22 s | 0.26 s | 0.000 | 19 ms |
| parent-bilan | mobile | 83 | 100 | 100 | 0.63 s | 2.30 s | 0.000 | 600 ms |
| parent-bilan | desktop | 100 | 100 | 100 | 0.19 s | 0.64 s | 0.005 | 55 ms |
| parent-maison | mobile | 86 | 100 | 100 | 0.62 s | 2.01 s | 0.000 | 528 ms |
| parent-maison | desktop | 100 | 100 | 100 | 0.20 s | 0.64 s | 0.000 | 53 ms |
| parent-mes-seances | mobile | 87 | 100 | 100 | 0.63 s | 1.90 s | 0.000 | 503 ms |
| parent-mes-seances | desktop | 100 | 98 | 100 | 0.18 s | 0.53 s | 0.005 | 30 ms |
| parent-seances-video | mobile | 86 | 100 | 100 | 0.63 s | 1.81 s | 0.000 | 546 ms |
| parent-seances-video | desktop | 100 | 100 | 100 | 0.19 s | 0.53 s | 0.005 | 35 ms |
| coach-tableau-de-bord | mobile | 86 | 100 | 100 | 0.62 s | 1.81 s | 0.063 | 486 ms |
| coach-tableau-de-bord | desktop | 99 | 100 | 100 | 0.19 s | 0.48 s | 0.067 | 30 ms |
| admin-dashboard | mobile | 82 | 100 | 100 | 0.63 s | 2.00 s | 0.125 | 533 ms |
| admin-dashboard | desktop | 100 | 100 | 100 | 0.18 s | 0.56 s | 0.033 | 31 ms |
