# ListRow

Rangée de liste inset grouped iOS : pastille d'icône, titre, sous-titre, valeur, chevron ou toggle.

- Hauteur minimale `row-min` (52 pt), padding latéral `space-4`, liste sur `bg-grouped-2` au rayon `radius-card`.
- Filet `separator` de 0,5 pt, décalé à 60 pt quand la rangée a une pastille.
- Pastille 30 × 30, rayon 8, couleur système (`sys-orange`, `sys-teal`, `sys-indigo`…), icône blanche.
- Toggle 64 × 28 (iOS 26/27), `sys-green` activé. Action destructive centrée en `sys-red`.
- Le consommateur fournit : titre, sous-titre facultatif, valeur ou accessoire, icône et sa couleur.
