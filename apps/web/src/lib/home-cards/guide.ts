// ─────────────────────────────────────────────────────────────────────────────
// Textes d'accompagnement du module « À la maison » (PARTIE 1 du fichier
// maître, hors cartes). Affichés tels quels — markdown inline conservé.
//
// Règle §0.6 : le parent ne voit jamais les autres paquets. Les tableaux
// par âge (plan, cinq cartes, quand ça ne va pas) sont donc indexés par paquet
// et l'app n'affiche que la colonne de l'enfant.
// ─────────────────────────────────────────────────────────────────────────────

import type { Deck } from './parse';

export type GuideSection = { id: string; title: string; paragraphs: string[]; list?: string[]; after?: string[] };

export const WELCOME: GuideSection = {
  id: 'bienvenue',
  title: 'Bienvenue',
  paragraphs: [
    'Votre enfant vient de commencer le programme THRIVE.',
    'Pendant 13 semaines, il va travailler quelque chose de précis à chaque séance : ses forces, ses objectifs, son courage, ses émotions, sa concentration, sa façon de demander de l’aide.',
    'Mais voici ce qu’on sait, et c’est toute la raison d’être de ces cartes :',
    '**Ce qui se travaille à l’entraînement reste à l’entraînement — sauf si ça se rejoue à la maison.**',
    'Une carte, c’est 10 à 20 minutes. Pas de théorie, pas de matériel compliqué, aucune compétence particulière à avoir. Vous n’avez rien à corriger et rien à évaluer.',
    'Vous avez juste à passer un bon moment avec votre enfant, autour d’une chose précise.',
    '**Le seul objectif : qu’il s’amuse — et qu’il reparte avec quelque chose en plus, sans même s’en rendre compte.**',
  ],
};

export const WHY_IT_WORKS: GuideSection = {
  id: 'pourquoi',
  title: 'Pourquoi ces activités fonctionnent',
  paragraphs: [
    'Les enfants apprennent par l’expérience, pas par les explications.',
    'On peut répéter cent fois à un enfant qu’il est capable : ça ne change rien. Mais s’il **vit** une réussite, s’il **voit** son progrès, s’il **entend** exactement ce qu’il a bien fait — là, ça s’installe.',
    'C’est ce que font ces activités. Chacune lui permet de :',
  ],
  list: [
    'vivre une réussite réelle, à sa portée',
    'découvrir une capacité qu’il ne savait pas avoir',
    'oser essayer sans risque',
    'décider quelque chose par lui-même',
    'entendre un regard positif et précis sur lui',
  ],
  after: [
    '**Ce qui compte, ce n’est jamais la performance. C’est l’expérience vécue.**',
    'Et il y a un deuxième effet, dont on parle moins : ces moments vous font du bien à vous aussi. Quinze minutes assis avec votre enfant, sans téléphone, sur quelque chose qui le concerne lui — c’est rare, et il s’en souviendra longtemps après avoir oublié le contenu de l’exercice.',
  ],
};

export const THEMES_INTRO =
  'Le programme THRIVE repose sur huit thèmes issus de la recherche en psychologie. Chaque carte en travaille un. Vous n’avez pas besoin de les connaître pour faire les activités — mais si vous voulez savoir ce qui se passe sous le capot, le voici, en une phrase chacun.';

export const THEMES: { title: string; science: string; text: string }[] = [
  { title: 'Le moteur intérieur', science: 'l’autodétermination', text: 'Un enfant s’investit vraiment dans ce qu’il a **choisi**. Ce qu’on lui impose, il l’exécute — puis il décroche. D’où toutes les cartes où c’est lui qui décide.' },
  { title: 'Les preuves', science: 'la confiance en ses capacités', text: 'On ne devient pas confiant parce qu’on nous complimente. On devient confiant en accumulant des réussites qu’on peut montrer du doigt. D’où toutes les cartes qui fabriquent des preuves visibles.' },
  { title: 'Ce qu’il a de bon en lui', science: 'le développement positif', text: 'On ne part pas de ce qui lui manque. On part de ce qui est déjà là, et on le développe. Un enfant n’est pas un problème à corriger.' },
  { title: 'Les outils qui servent partout', science: 'les habiletés de vie', text: 'Se fixer un objectif, gérer son temps, dire ce dont on a besoin, régler un conflit : le sport est le terrain d’entraînement, la vie est le vrai terrain de jeu.' },
  { title: 'Le plaisir et le sens', science: 'le bien-être', text: 'Un enfant qui a du plaisir et qui sait pourquoi il fait les choses continue. Un enfant qui n’a que de la pression arrête — souvent vers 13 ou 14 ans.' },
  { title: 'Qui il est', science: 'les forces de caractère', text: 'Ce n’est pas « ce qu’il sait faire », c’est « qui il est » : courageux, curieux, loyal, drôle. Nommer ces forces à voix haute construit son identité bien plus solidement qu’un résultat.' },
  { title: 'L’effort plutôt que le résultat', science: 'le climat de maîtrise', text: 'L’ambiance que créent les adultes autour de lui change tout. On valorise ce qu’il a fait, jamais ce qu’il a gagné. Et on ne le compare à personne. Jamais.' },
  { title: 'Le bon exercice au bon âge', science: 'le stade de développement', text: 'Un enfant de 9 ans et un ado de 16 ans n’ont pas les mêmes besoins. C’est exactement pour ça que les cartes sont triées en trois paquets.' },
];

export const HOW_IT_WORKS: { title: string; text: string }[] = [
  { title: 'Une carte après chaque séance.', text: 'Chaque carte est reliée à une séance précise du programme, et l’app vous propose les bonnes au bon moment. Faites-la dans les jours qui suivent, pendant que c’est frais dans sa tête : c’est là qu’elle a le plus d’effet.' },
  { title: 'Votre paquet dépend de son âge.', text: '' },
  { title: 'Une seule carte par semaine suffit.', text: 'S’il y en a trois, prenez celle qui vous ressemble le plus. Les autres restent disponibles toute l’année.' },
  { title: 'Une carte ratée ne casse rien.', text: 'Une carte forcée, oui. Si ce n’est pas le bon soir, reportez.' },
];

// Ligne du tableau « Votre paquet dépend de son âge » — seule celle de l'enfant s'affiche.
export const DECK_ROW: Record<Deck, { age: string; text: string }> = {
  A: { age: '8 à 11 ans', text: 'On joue. Vous participez à fond. 5 à 12 minutes, pas plus.' },
  B: { age: '12 à 14 ans', text: 'On parle vrai, avec des exemples de sa vie. Vous êtes là, mais en retrait. 10 à 15 minutes.' },
  C: { age: '15 à 17 ans', text: 'Il réfléchit seul, vous posez la question. Vous proposez, vous ne supervisez pas. 15 à 20 minutes.' },
};

export const RULES_INTRO =
  'Elles ont l’air simples. Elles font toute la différence entre une activité qui aide et une activité qui pèse.';

export const RULES: { title: string; text: string }[] = [
  { title: 'Vous n’êtes pas son deuxième coach.', text: 'Vous n’avez rien à corriger. Il a déjà un coach. Vous, vous êtes son parent — c’est infiniment plus rare et plus précieux pour lui.' },
  { title: 'Il parle en premier. Comptez jusqu’à 5 avant de relancer.', text: 'Le silence n’est pas un vide à combler : c’est là qu’il réfléchit. La plupart des parents relancent au bout de deux secondes. Tenez jusqu’à cinq.' },
  { title: 'On parle de ce qu’il a fait, jamais de ce qu’il a gagné.', text: '« T’as repris cinq fois de suite sans lâcher » vaut mille fois « t’as gagné ». Et jamais, jamais de comparaison avec un autre jeune.' },
];

export const JOKER = {
  title: 'La carte joker',
  subtitle: 'Disponible à tout moment, dès aujourd’hui',
  intro: 'Il y a des soirs où ça ne va pas. Il rentre fermé, fâché, ou il ne veut rien faire. Ces soirs-là, ne sortez aucune carte. Faites ça :',
  sit: 'Asseyez-vous à côté de lui. Dites-lui :',
  script: '« Je ne te demande rien. Je suis juste content que tu sois là. »',
  then: 'Puis taisez-vous.',
  thenRest: 'Restez 5 minutes. Partez.',
  outro: 'C’est la carte la plus puissante du paquet. Elle ne travaille aucun exercice — elle construit la seule chose sans laquelle rien d’autre ne fonctionne.',
};

export const TOP_FIVE: Record<Deck, string[]> = {
  A: ['A10', 'A07', 'A22', 'A30', 'A32'],
  B: ['B17', 'B11', 'B09', 'B23', 'B01'],
  C: ['C17', 'C16', 'C02', 'C13', 'C28'],
};

export const HARD_NIGHTS_INTRO =
  'Certains soirs, vous n’avez pas besoin de la carte de la semaine, mais de celle qui correspond au moment.';

export const HARD_NIGHTS: { situation: string; cards: Record<Deck, string[]> }[] = [
  { situation: 'Il rentre frustré d’un match', cards: { A: ['A13', 'A15'], B: ['B11', 'B17'], C: ['C09', 'C17'] } },
  { situation: 'Il doute de lui', cards: { A: ['A07', 'A08'], B: ['B07', 'B09'], C: ['C06', 'C07'] } },
  { situation: 'Il n’a plus de plaisir', cards: { A: ['A24', 'A33'], B: ['B03', 'B24'], C: ['C02', 'C18'] } },
  { situation: 'Il stresse avant les matchs', cards: { A: ['A14', 'A17'], B: ['B12', 'B14'], C: ['C11', 'C12', 'C15'] } },
  { situation: 'On ne se parle plus', cards: { A: ['A03', 'A20'], B: ['B03', 'B21'], C: ['C16', 'C31'] } },
  { situation: 'Il est débordé, épuisé', cards: { A: ['A10', 'A16'], B: ['B06', 'B16'], C: ['C04', 'C29'] } },
  { situation: 'Ça se passe mal dans l’équipe', cards: { A: ['A21', 'A31'], B: ['B29', 'B30'], C: ['C20', 'C30'] } },
];

export const PARENT_ROLE = {
  title: 'Le rôle du parent, en quatre lignes',
  intro: 'Un enfant construit sa confiance quand :',
  list: [
    'il se sent écouté',
    'ses efforts sont reconnus précisément',
    'ses émotions sont accueillies sans être corrigées',
    'il a le droit de se tromper',
  ],
  outro: 'Ce n’est pas plus compliqué que ça. Et ce n’est pas un hasard si ces quatre points sont exactement ce que fait son coach pendant ses treize séances.',
};

export const CLOSING: { title: string; text: string }[] = [
  { title: 'Une carte ratée ne casse rien.', text: 'Si vous en faites cinq sur treize, c’est déjà énorme. Ce programme n’est pas un devoir de plus dans une vie déjà pleine.' },
  { title: 'Vous n’avez pas à être parfait.', text: 'Vous allez corriger alors qu’il ne fallait pas. Vous allez parler pendant le silence. Ce n’est pas grave.' },
  { title: 'Ce que votre enfant retiendra', text: ', c’est que vous vous êtes assis avec lui, quinze minutes, sans téléphone, pour quelque chose qui le concernait lui. C’est exactement ça, le programme. Le reste — les forces, les objectifs, les routines — n’est que la façon d’y arriver.' },
];

export const DISCLAIMER =
  'Ce document est un outil psychoéducatif de soutien parental. Il ne constitue ni une psychothérapie ni un traitement clinique, et ne remplace pas le suivi d’un psychologue, d’un médecin ou d’un autre professionnel de la santé. Si une situation vous préoccupe chez votre enfant, parlez-en à un professionnel — vous pouvez aussi en parler à votre coach THRIVE, qui saura vous orienter.';
