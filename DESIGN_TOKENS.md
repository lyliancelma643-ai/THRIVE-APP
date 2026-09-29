# THRIVE — Design tokens

Référence courte pour que chaque nouvelle fonctionnalité reste cohérente sur téléphone, iPad et ordinateur.
Sources : `apps/web/tailwind.config.ts` (classes) et `apps/web/src/app/globals.css` (variables CSS).
Règle générale : **pas de valeur codée en dur** quand un token existe ; une nouvelle valeur récurrente devient un token ici.

## 1. Couleurs

### Marque (fixes)
| Token | Valeur | Usage |
|---|---|---|
| `navy-600` | #004E7A | Marine de marque : boutons principaux, sidebar active, liens forts |
| `navy-900` | #022539 | Texte fort des zones claires, fond des barres coach / admin |
| `navy-50…800` | échelle | Fonds, bordures, états |
| `cream` | #F7F5F2 | Fond des zones claires (connexion, coach, admin) |
| `sun` | #F9EB50 | Accent d'action (un seul accent par écran) |
| `sage` | #A7C4BC | Aplats, puces, graphiques — **pas en texte sur fond clair** |
| `success` / `warning` / `danger` | #16A34A / #D97706 / #DC2626 | Sémantique (+ `light`, `dark`) |

### Ambiances de l'espace parent (variables, `[data-theme]` sur `<html>`)
Toujours passer par les classes Tailwind branchées dessus — jamais `text-white/xx` dans l'espace parent.

| Classe | Variable | Rôle |
|---|---|---|
| `bg-night-bg` | `--bg` | Fond de page |
| `bg-night-surface` | `--surface` | Cartes, rangées, menus |
| `text-ink` / `text-night-ink` | `--text` | Titres, chiffres |
| `text-body` | `--text2` | Texte courant |
| `text-soft` | `--text3` | Texte secondaire |
| `text-faint` | `--text4` | Métadonnées (AA dans les deux ambiances ; #56626B le jour) |
| `text-meta` | `--meta` | Heures et accusés des bulles (64 % la nuit, #56626B le jour) |
| `text-accent-ink` | `--accent-ink` | Accent lisible en texte (jaune la nuit, marine le jour) |
| `text-sage-ink` | `--sage-ink` | Sauge lisible en texte (#A7C4BC / #46695F) |
| `text-danger-ink` | `--danger-ink` | Erreurs, déconnexion (#FCA5A5 / #991B1B) |
| — | `--warn-ink`, `--warn-num` | Séance reportée (ambre clair la nuit, #8A5A00 le jour) |
| — | `--bad-ink`, `--bad-num` | Séance manquée (rose clair la nuit, #B42318 le jour) |
| — | `--kid-mix` | Part de la couleur d'un enfant quand elle sert de texte : `color-mix(in srgb, <couleur> var(--kid-mix), var(--text))` (100 % la nuit, 42 % le jour) |
| `border-line`, `bg-chip`, `bg-track`, `bg-field` | `--line`, `--chip`, `--track`, `--field` | Filets, pastilles, jauges, champs |

**Contraste minimal** : 4,5:1 texte courant, 3:1 gros texte et icônes utiles, dans **les deux ambiances**.
Zones claires (coach, admin, fond crème) : texte secondaire au minimum `text-gray-600` / `text-slate-600` / `text-navy-600/80` ; couleurs d'état en texte au niveau **700** (`text-red-700`, `text-amber-700`, `text-emerald-700`…) ; pas de texte informatif sous `opacity-60`.

## 2. Typographie
- Familles : `font-sans` (Inter) pour le texte, `font-display` (Fraunces) pour les titres.
- Titre d'écran : `font-display text-[28px] md:text-3xl leading-tight font-semibold` (+ `text-balance`).
- Titre de section : `font-display text-[20px] md:text-[22px] font-semibold`.
- Étiquette de section : `.nc-eyebrow` (12 px, 700, capitales espacées).
- Corps : 15–17 px, interligne 1,5 ; paragraphes longs en `text-pretty` et `max-w-prose`.
- Chiffres (scores, jauges, minuteurs, dates) : `tabular-nums`.
- Champs de saisie : **16 px minimum sur tout écran tactile** (règle globale, évite le zoom iOS).

## 3. Espacements et mise en page
- Grille 4 / 8 px (échelle Tailwind). Gouttières : 20 px téléphone, 32 px iPad, 32–40 px ordinateur.
- Largeurs max : espace parent `max-w-7xl` ; coach `max-w-6xl` ; admin `1320 px` ; texte long `max-w-prose`.
- Points de rupture : `sm 640` · `md 768` (iPad portrait) · `lg 1024` (iPad paysage / ordinateur) · `xl 1280`.
- Hauteurs plein écran : `min-h-dvh` / `100dvh` (jamais `100vh`).
- Safe areas : `.safe-top`, `.safe-bottom`, `env(safe-area-inset-*)` sur tout élément fixe.

## 4. Navigation par format
| | Téléphone (< 768) | iPad portrait (768–1023) | ≥ 1024 |
|---|---|---|---|
| Parent | Onglets en bas | Onglets en bas | Onglets segmentés au centre de l'en-tête |
| Coach | Onglets en bas (libellés courts) | Rail d'icônes 88 px | Barre latérale 256 px |
| Admin | Menu en feuille plein écran | Rail d'icônes par sections | Barre latérale par sections |

## 5. Rayons
`rounded-chip` 12 · `rounded-tile` 16 · `rounded-row` 18 · `rounded-card` 22 · `rounded-sheet` 26 · `rounded-full`.
Une carte = `rounded-card`, une rangée de liste = `rounded-row`, une vignette = `rounded-tile`.

## 6. Profondeur
- Parent : aplats sans ombre la nuit, `shadow-[var(--shadow)]` le jour (déjà inclus dans `.nc-card` / `.nc-row`).
- Zones claires : `shadow-card`, `hover:shadow-card-hover` pour les cartes cliquables.
- Menus et feuilles : ombre `0 18px 50px rgba(0,10,20,.5)`.

## 7. Empilement (z-index)
`z-sticky` 30 · `z-header` 40 · `z-nav` 50 · `z-backdrop` 60 · `z-popover` 70 · `z-overlay` 80 · `z-modal` 90 · `z-toast` 100.

## 8. Mouvement
| Token | Valeur | Usage |
|---|---|---|
| `--dur-fast` / `duration-fast` | 150 ms | Micro-interactions, menus |
| `--dur-base` / `duration-base` | 220 ms | Couleurs, petits panneaux |
| `--dur-slow` / `duration-slow` | 300 ms | Feuilles, transitions d'écran |
| `--ease-out` / `ease-brand` | cubic-bezier(.22,.61,.36,1) | Entrées |
| `--ease-in` / `ease-exit` | cubic-bezier(.4,0,1,1) | Sorties (plus vives que les entrées) |

- N'animer que `transform` et `opacity`.
- `prefers-reduced-motion` est respecté globalement.
- Survol : uniquement sur pointeur fin (`hoverOnlyWhenSupported`, ou `@media (hover:hover) and (pointer:fine)`).

## 9. Interactions
- Cible tactile ≥ 44 × 44 px (règle `pointer: coarse` dans coach / admin, classes dédiées ailleurs).
- États obligatoires : survol (pointeur), `:focus-visible` (anneau global jaune + halo marine), pressé
  (`scale(.98)` global), désactivé, chargement (`<Button loading>` garde la taille).
- Modales : `useModalDismiss(onClose, active, lockScroll, ref)` — Échap, piège du focus, retour du focus,
  verrouillage du scroll sans saut. Feuille du bas sur téléphone (voir `bilans/sheet.tsx`).
- Menus : `useMenuKeyboard` (focus sur la 1re entrée, ↑ ↓, Échap rend le focus) + `animate-menu-in`.
- Rangées défilantes : composant `Rail` (doigt, souris, clavier, indicateur de position).
- Tableaux coach / admin : en cartes sur téléphone automatiquement (`useResponsiveTables`).

## 10. Icônes et microcopie
- Icônes : uniquement le jeu SVG `components/ui/Icon` (trait 1,9 sur grille 24), décoratives par défaut.
  Jamais d'emoji ni de glyphe (▶ ✕ ← →) comme icône d'interface.
- Ton : **tutoiement** partout, bienveillant, clair ; vocabulaire : « séance » (1:1 et vidéo), « moment » / « activité »
  (Maison), « bilan », « coach ».
