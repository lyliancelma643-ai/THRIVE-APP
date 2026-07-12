'use client';

// Fiches d'explication des cartes + modale + squelette de chargement —
// extraits de page.tsx (chantier découpage 2026-07-11), contenu identique.
import { useEffect } from 'react';

/* ────────────────────────────────────────────────────────────────────────────
   Fiches d'explication des cartes — contenu vulgarisé pour le parent et
   l'enfant, tiré du document « LA MÉTHODE THRIVE : PROTOCOLE » (v1.0, 2026).
──────────────────────────────────────────────────────────────────────────── */
type InfoSection = { label: string; text?: string; bullets?: string[] };
export type CardInfo = {
  icon: string;
  badge: string;
  title: string;
  tagline: string;
  sections: InfoSection[];
  tip?: string;
};

export const CARD_INFO: Record<string, CardInfo> = {
  passeport: {
    icon: '◷',
    badge: 'Séance 1',
    title: 'Passeport athlète',
    tagline: "La carte d'identité sportive de ton enfant, construite dès la première rencontre.",
    sections: [
      {
        label: "C'est quoi ?",
        text: "Le résumé de qui est ton enfant en tant qu'athlète : son sport, son poste, son club, son coach et sa force n°1. Il est rempli avec le coach lors de la séance 1, puis mis à jour tout au long du parcours.",
      },
      {
        label: 'Pourquoi c’est important ?',
        text: "THRIVE commence par apprendre à connaître le jeune — pas à l'évaluer. À la première séance : aucun chrono, aucun score, aucune note. Le coach observe, écoute et découvre. C'est cette relation de confiance qui rend tout le reste possible.",
      },
      {
        label: 'Ce que le coach y note',
        bullets: [
          'Son histoire sportive : comment le sport est entré dans sa vie',
          '2 à 3 forces observées pendant qu’il joue — vues en action, pas déclarées',
          'Son rêve de saison, en une seule phrase',
        ],
      },
    ],
    tip: 'Demande à ton enfant : « C’est quoi ta plus grande force sur la glace ? » Sa réponse vient directement de ce travail avec le coach.',
  },
  programme: {
    icon: '★',
    badge: 'S1 → S13',
    title: 'Programme complété',
    tagline: 'Le chemin parcouru sur les 13 séances de la méthode THRIVE.',
    sections: [
      {
        label: "C'est quoi ?",
        text: "Cette jauge montre combien de séances sont terminées sur les 13 du programme. Chaque séance combine un exercice sur la glace, un moment d'apprentissage de 10 à 15 minutes et une discussion pour relier le tout à la vraie vie.",
      },
      {
        label: 'Les 3 phases du parcours',
        bullets: [
          'ANCRER (S1–S2) : créer la confiance, mesurer le point de départ, fixer le cap ensemble',
          'DÉVELOPPER (S3–S10) : apprendre les outils un par un — confiance, émotions, respiration, concentration, imagerie mentale',
          'INTÉGRER (S11–S13) : rassembler ses outils, devenir autonome, célébrer',
        ],
      },
      {
        label: 'Pourquoi 13 séances ?',
        text: "Assez long pour créer de vrais changements durables, assez court pour garder la motivation intacte. Chaque séance s'appuie sur la précédente, comme les marches d'un escalier.",
      },
    ],
    tip: 'La régularité compte plus que la vitesse : mieux vaut une séance par semaine bien ancrée que trois séances pressées.',
  },
  perma: {
    icon: '☀️',
    badge: 'Après chaque séance',
    title: 'Progression du bien-être',
    tagline: 'La météo du bien-être de ton enfant, séance après séance.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'EPOCH est une échelle scientifique de bien-être validée pour les 10–18 ans (Kern, Benson, Steinberg & Steinberg, 2016). Après chaque séance, ton enfant répond à un court questionnaire sur son bien-être.',
      },
      {
        label: 'Les 5 dimensions',
        bullets: [
          'Engagement — se plonger à fond dans ses activités',
          'Persévérance — aller au bout de ce qu’on entreprend',
          'Optimisme — voir l’avenir avec confiance',
          'Connexion aux autres — se sentir entouré et soutenu',
          'Bonheur — se sentir heureux, joyeux, s’amuser',
        ],
      },
      {
        label: 'Comment ça marche ?',
        text: "La mesure est prise après chaque séance : la courbe suit l'évolution du bien-être tout au long des 13 séances. Chaque point est la moyenne des 5 dimensions (20 questions, échelle de « presque jamais » à « presque toujours »).",
      },
    ],
    tip: 'Le bien-être et la performance vont ensemble : un enfant qui se sent bien apprend et progresse mieux.',
  },
  lsss: {
    icon: '⤢',
    badge: 'Mesuré S1 · S7 · S13',
    title: 'Progression des compétences de vie',
    tagline: 'La courbe scientifique qui montre ce que le sport apprend… pour la vie.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'LSSS veut dire « Life Skills Scale for Sport » : une échelle scientifique validée par des chercheurs (Cronin & Allen, 2017). Ton enfant répond à des phrases qui commencent toutes par : « Ce sport m’a appris à… ».',
      },
      {
        label: 'Ce qu’elle mesure',
        bullets: [
          'Se fixer des objectifs et les atteindre',
          'Reconnaître et gérer ses émotions',
          'Travailler en équipe et communiquer',
          'Résoudre des problèmes et s’organiser',
        ],
      },
      {
        label: 'Comment ça marche ?',
        text: "La mesure est prise 3 fois : au départ (S1), à mi-parcours (S7) et à la fin (S13). Si la courbe monte, les compétences grandissent — pas seulement au hockey, partout. Le questionnaire est adapté à l'âge : pour les 8–11 ans, c'est le coach qui observe avec une grille.",
      },
    ],
    tip: 'La « zone cible » sur le graphique montre le niveau qu’on veut atteindre ensemble d’ici la fin du programme.',
  },
  parcours: {
    icon: '▦',
    badge: '13 étapes',
    title: 'Parcours des 13 séances',
    tagline: 'La carte du voyage THRIVE, pastille par pastille.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Chaque pastille représente une séance. Les dorées sont des étapes clés : S1 (le grand départ et la première mesure), S4 (le travail sur les émotions commence), S7 (le bilan de mi-parcours, où le parent est rencontré).',
      },
      {
        label: 'À quoi ressemble une séance ?',
        bullets: [
          'Un exercice sportif concret : tirs, slalom, défis chronométrés',
          'Un moment d’apprentissage de 10 à 15 minutes sur une compétence de vie',
          'Une question de transfert : « Où pourrais-tu utiliser ça à l’école ? »',
        ],
      },
      {
        label: 'La règle d’or',
        text: "La difficulté vient toujours de l'exercice, jamais du coach. Un coach THRIVE ne critique pas pour « endurcir » : la recherche montre que ça produit l'effet inverse chez les jeunes.",
      },
    ],
    tip: 'Après chaque séance, demande plutôt « Qu’est-ce que tu as appris ? » que « As-tu gagné ? ».',
  },
  competences: {
    icon: '✓',
    badge: 'Score global',
    title: 'Compétences de vie',
    tagline: 'Le niveau global des habiletés utiles partout — pas juste sur la glace.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Un score qui résume où en est ton enfant dans ses « life skills » : les compétences qu’on apprend par le sport mais qu’on utilise dans toute la vie — à l’école, à la maison, avec les amis.',
      },
      {
        label: 'Les 8 familles mesurées',
        bullets: [
          'Fixer des objectifs',
          'Gérer ses émotions',
          'Travailler en équipe',
          'Communiquer',
          'Créer des liens (habiletés sociales)',
          'Prendre le leadership',
          'Résoudre des problèmes',
          'Gérer son temps',
        ],
      },
      {
        label: 'Pourquoi c’est le vrai but ?',
        text: "THRIVE n'est pas un programme pour former un meilleur joueur de hockey — c'est un programme pour former un jeune plus solide, qui utilise le hockey comme terrain d'entraînement. Le score qui monte, c'est ça, la victoire.",
      },
    ],
    tip: 'Cette jauge suit les mesures LSSS (S1 · S7 · S13) : elle avance au rythme des vraies évaluations, pas des impressions.',
  },
  boite: {
    icon: '◎',
    badge: 'Séance 11',
    title: 'Boîte à outils',
    tagline: 'Les outils mentaux collectés séance après séance — et gardés pour la vie.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Au fil du programme, ton enfant construit des outils concrets : la respiration qui calme, le focus word, la routine pré-tir, l’auto-encouragement… À la séance 11, il remplit sa « Carte Ma Boîte à Outils » : c’est lui qui nomme ses 6 outils et explique quand il les utilise en dehors du sport.',
      },
      {
        label: 'Pourquoi c’est puissant ?',
        text: 'Le but est qu’il puisse se dire : « Je suis quelqu’un qui a des outils ». Un outil qu’on sait nommer soi-même est un outil qu’on réutilise seul — même quand le coach n’est plus là. C’est ce que les chercheurs appellent le transfert conscient.',
      },
      {
        label: 'Le focus word',
        text: 'Le mot-ancre affiché sur cette carte est l’outil le plus personnel de la boîte : un mot choisi par ton enfant pour ramener sa concentration au bon endroit.',
      },
    ],
    tip: 'La carte des 6 outils lui appartient : il la garde après le programme. Affichez-la quelque part à la maison !',
  },
  etapes: {
    icon: '⊟',
    badge: 'À venir',
    title: 'Prochaines étapes',
    tagline: 'Ce qui s’en vient dans le parcours — pour ne rien manquer.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Le radar des prochaines actions : la séance à programmer, les prochains outils à débloquer et les grandes étapes du parcours (bilan LSSS, boîte à outils, lettre finale).',
      },
      {
        label: 'Pourquoi un ordre précis ?',
        text: 'Chaque outil s’appuie sur le précédent : on apprend d’abord à reconnaître ses émotions (S4) avant de les calmer (S5), à respirer (S6) avant de se concentrer (S9). Sauter des étapes, c’est construire sur du sable.',
      },
      {
        label: 'Le rôle du parent',
        bullets: [
          'Assurer la régularité des séances',
          'Poser des questions curieuses — sans corriger',
          'Célébrer les progrès d’effort, pas seulement les résultats',
        ],
      },
    ],
    tip: 'Ta présence est attendue à deux moments clés : le bilan de mi-parcours (S7) et la célébration finale (S13).',
  },
  identite: {
    icon: '◈',
    badge: 'Séance 1',
    title: 'Fiche Identité Athlète',
    tagline: 'Le portrait de départ : forces, histoire et rêve de saison.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Le tout premier document du parcours, rempli pendant la séance 1. Il contient l’histoire sportive de ton enfant, ses forces de caractère et son rêve de saison en une phrase.',
      },
      {
        label: 'Les forces (VIA)',
        text: 'Les forces sont repérées avec un outil scientifique reconnu — l’inventaire VIA : persévérance, courage, curiosité, humour… La particularité THRIVE : le coach les observe pendant que l’enfant patine. Ce sont des forces vues en action, pas cochées sur un papier.',
      },
      {
        label: 'Le rêve de saison',
        text: 'Une phrase, choisie par l’enfant, qui dit où il veut aller. C’est le moteur émotionnel de tout le programme : chaque objectif fixé ensuite se rattache à ce rêve.',
      },
      {
        label: 'Pourquoi commencer par là ?',
        text: 'Commencer par les forces — et non les faiblesses à corriger — construit la confiance dès le premier jour. Un jeune qui se sent vu et valorisé apprend mieux : c’est démontré.',
      },
    ],
    tip: 'Relisez le rêve de saison ensemble de temps en temps : « On en est où, par rapport à ton rêve ? »',
  },
  objectif: {
    icon: '◎',
    badge: 'Séance 2',
    title: 'Fiche Objectif THRIVE',
    tagline: 'Deux objectifs choisis par ton enfant — un pour le sport, un pour la vie.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'À la séance 2, ton enfant formule lui-même — pas le coach, pas le parent ! — deux objectifs pour la saison : un objectif sportif technique et un objectif de compétence de vie.',
      },
      {
        label: 'SMART, expliqué simplement',
        bullets: [
          'Spécifique — précis, pas vague',
          'Mesurable — on peut vérifier si c’est atteint',
          'Atteignable — un défi, mais possible',
          'Réaliste — adapté à sa situation',
          'Temporel — avec une échéance claire',
        ],
      },
      {
        label: 'Le secret : viser le processus',
        text: 'THRIVE apprend à viser ce qu’on contrôle : « réussir 7 tirs sur 10 à l’entraînement » plutôt que « gagner le match ». On ne contrôle pas le résultat d’un match — mais on contrôle son effort, sa préparation, son attitude. C’est la liste « Ce qui dépend de moi ».',
      },
    ],
    tip: 'Cette méthode marche aussi à l’école : propose-lui de formuler un objectif SMART avant son prochain examen.',
  },
  focus: {
    icon: '✦',
    badge: 'Séance 9',
    title: 'Focus Word',
    tagline: 'Un seul mot, choisi par ton enfant, pour ramener sa tête au bon endroit.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Un mot court — 1 à 3 syllabes — que ton enfant a choisi lui-même : « glisse », « calme », « bâton »… Il se le dit juste avant un moment difficile pour concentrer son attention sur le geste, pas sur la peur de rater.',
      },
      {
        label: 'L’idée derrière',
        text: 'Se concentrer, ce n’est pas « ne penser à rien » — c’est impossible ! C’est choisir à quoi on pense. Le coach l’explique ainsi : « Ta tête, c’est comme un projecteur. T’as le contrôle de ce que tu éclaires. »',
      },
      {
        label: 'Et quand une pensée parasite arrive ?',
        text: 'On la laisse passer comme un nuage, et on revient à son mot. La vraie concentration, ce n’est pas ne jamais partir — c’est revenir vite. Cette approche enlève la culpabilité des distractions et fait de la concentration une compétence qui s’entraîne.',
      },
    ],
    tip: 'Ton enfant a une petite carte avec son mot (format billet de métro). Elle marche aussi avant un exposé ou un devoir — glisse-la dans son agenda.',
  },
  emotions: {
    icon: '◍',
    badge: 'Séances 4 · 5',
    title: 'Roue des Émotions',
    tagline: 'D’abord reconnaître ce qu’on ressent, ensuite savoir quoi en faire.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Un outil visuel avec 6 émotions fréquentes dans le sport : frustration, peur, colère, joie, fierté, nervosité. En S4, ton enfant apprend à reconnaître et nommer l’émotion pendant l’action. En S5, il apprend à agir dessus.',
      },
      {
        label: 'Pourquoi nommer d’abord ?',
        text: 'Une émotion qu’on sait nommer précisément est une émotion qu’on gère mieux — c’est un des résultats les plus solides de la recherche. Mettre un mot dessus, c’est déjà reprendre le contrôle.',
      },
      {
        label: 'Les 2 stratégies apprises',
        bullets: [
          'La respiration 4-7-8 : inspirer 4 secondes, retenir 7, souffler 8 — ça calme réellement le corps (le cœur ralentit)',
          'La phrase de recentrage, choisie par l’enfant : « Je recommence — c’est juste un tir »',
        ],
      },
      {
        label: 'La règle éthique',
        text: 'Le coach ne provoque jamais d’émotion par des critiques. La difficulté vient de l’exercice lui-même — jamais de la pression d’un adulte. C’est une frontière non négociable de la méthode.',
      },
    ],
    tip: 'Après un match ou une grosse journée : « T’étais où sur la roue, aujourd’hui ? » — une question simple qui ouvre de vraies conversations.',
  },
  routine: {
    icon: '◷',
    badge: 'Séance 6',
    title: 'Routine pré-tir',
    tagline: '3 étapes, toujours les mêmes, pour rester calme sous pression.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Une mini-séquence que ton enfant exécute toujours de la même façon avant une action sous pression : ① respirer (expirer lentement, sentir le ventre), ② sentir ses appuis (« Sens tes pieds sur la glace, tes mains sur le bâton — ici, maintenant »), ③ dire son mot-ancre et y aller.',
      },
      {
        label: 'Pourquoi ça marche vraiment ?',
        text: 'L’expiration lente active le système qui calme le corps : le cœur ralentit, les muscles se relâchent. Ce n’est pas de la magie, c’est de la physiologie. Et réussir à se calmer soi-même donne une confiance d’un nouveau genre : « Je peux contrôler ma réaction au stress ».',
      },
      {
        label: 'Apprise sous vraie pression',
        text: 'La routine est entraînée pendant des tirs chronométrés avec score visible — une pression réelle mais bienveillante. Une technique apprise seulement au calme ne fonctionne pas le jour du match : c’est pour ça que THRIVE l’entraîne en situation.',
      },
    ],
    tip: 'Ton enfant a une carte plastifiée des 3 étapes dans son sac de hockey. La même routine marche avant un contrôle ou un exposé.',
  },
  contrat: {
    icon: '✎',
    badge: 'Séance 1',
    title: 'Contrat de confiance',
    tagline: 'Un engagement signé à trois : l’athlète, le coach… et toi.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Dès la première séance, les trois parties signent un engagement mutuel : l’enfant s’engage à essayer, le coach à accompagner sans juger, le parent à soutenir le parcours.',
      },
      {
        label: 'Pourquoi c’est fondamental ?',
        text: 'La recherche est formelle : ce qui fait le plus progresser un jeune, c’est la qualité du lien de confiance avec la personne qui l’accompagne — ce qu’on appelle l’« alliance ». Toute la séance 1 y est consacrée : zéro évaluation, zéro chrono, zéro score.',
      },
      {
        label: 'L’engagement du parent',
        bullets: [
          'Assurer la régularité des séances',
          'Encourager les efforts plus que les résultats',
          'Laisser le coach coacher — et rester le parent',
        ],
      },
    ],
    tip: 'Le mot d’ordre du coach en S1 : « Mon seul travail aujourd’hui, c’est d’apprendre qui tu es. »',
  },
  lettre: {
    icon: '✉',
    badge: 'Séance 13',
    title: 'Lettre à moi-même dans 1 an',
    tagline: 'Une capsule temporelle écrite par ton enfant, pour ton enfant.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'À la dernière séance, ton enfant écrit (ou dicte) une lettre à la personne qu’il sera dans un an : ce qu’il a appris, ce qu’il veut continuer, ce qu’il veut devenir. La lettre est scellée dans une enveloppe — interdiction de l’ouvrir avant 12 mois !',
      },
      {
        label: 'Pourquoi écrire ?',
        text: 'Mettre ses apprentissages en mots les fixe dans la mémoire. Et s’écrire à soi-même transforme les outils du programme en promesses personnelles — bien plus fort qu’un conseil venu d’un adulte.',
      },
      {
        label: 'Un an plus tard',
        text: 'En ouvrant la lettre, ton enfant mesure le chemin parcouru avec ses propres mots. C’est souvent un moment fort — pour lui comme pour toute la famille.',
      },
    ],
    tip: 'Notez ensemble la date d’ouverture au calendrier et faites-en un petit événement familial.',
  },
  certificat: {
    icon: '◈',
    badge: 'Séance 13',
    title: 'Certificat THRIVE',
    tagline: 'La reconnaissance officielle d’un parcours accompli — et personnalisée.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Le certificat est remis à la 13e et dernière séance, lors d’une célébration à laquelle le parent est invité pour les 10 dernières minutes. Il est personnalisé : il mentionne les 3 forces signatures identifiées dès la première séance.',
      },
      {
        label: 'Juste avant, la séance 12',
        text: 'Ton enfant dirige lui-même un exercice et l’explique à quelqu’un d’autre (un parent, un ami). Il passe du rôle d’élève à celui de guide — la meilleure preuve qu’il maîtrise ce qu’il a appris.',
      },
      {
        label: 'Le message du certificat',
        text: '« Tu as des forces, tu as des outils, et tu sais t’en servir. » Ce n’est pas un trophée de performance : c’est la reconnaissance d’une identité — celle d’un jeune qui a grandi.',
      },
    ],
    tip: 'Encadrez-le ! Les 3 forces qui y figurent sont de vrais repères que ton enfant pourra relire dans les moments de doute.',
  },
};

export function InfoModal({ info, onClose }: { info: CardInfo; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="b-modal-ov" role="dialog" aria-modal="true" aria-label={info.title} onClick={onClose}>
      <div className="b-modal" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.12)',
            color: 'rgba(234,243,241,.75)',
            fontSize: 16,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          ✕
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14, paddingRight: 56 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(249,235,80,.1)',
              border: '1px solid rgba(249,235,80,.25)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 17,
              color: '#F9EB50',
              flexShrink: 0,
            }}
          >
            {info.icon}
          </span>
          <span
            style={{
              padding: '5px 11px',
              borderRadius: 9,
              background: 'rgba(249,235,80,.12)',
              border: '1px solid rgba(249,235,80,.28)',
              fontWeight: 600,
              fontSize: 11,
              color: '#F9EB50',
            }}
          >
            {info.badge}
          </span>
        </div>
        <h2 className="disp" style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 26, lineHeight: 1.1 }}>
          {info.title}
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.5, color: 'rgba(234,243,241,.6)' }}>
          {info.tagline}
        </p>
        {info.sections.map((s) => (
          <div
            key={s.label}
            style={{
              marginBottom: 12,
              padding: '14px 16px',
              borderRadius: 14,
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.07)',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 10.5,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: '#A7C4BC',
                marginBottom: 7,
              }}
            >
              {s.label}
            </div>
            {s.text && (
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'rgba(234,243,241,.85)' }}>{s.text}</p>
            )}
            {s.bullets && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: s.text ? 8 : 0 }}>
                {s.bullets.map((b) => (
                  <div key={b} style={{ display: 'flex', gap: 9, alignItems: 'baseline' }}>
                    <span style={{ color: '#F9EB50', fontSize: 11, flexShrink: 0 }}>✦</span>
                    <span style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(234,243,241,.85)' }}>{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {info.tip && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '13px 15px',
              borderRadius: 14,
              background: 'rgba(249,235,80,.08)',
              border: '1px solid rgba(249,235,80,.22)',
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 15, flexShrink: 0, color: '#F9EB50', lineHeight: 1.3 }}>⌂</span>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 10.5,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: '#F9EB50',
                  marginBottom: 4,
                }}
              >
                À la maison
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'rgba(234,243,241,.88)' }}>{info.tip}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Squelette de chargement : évite le « saut » de données et le flash de
// l'état vide pendant que la liste des enfants charge encore.
export function BilanSkeleton() {
  return (
    <div className="-mx-4 md:-mx-6 -my-6 md:-my-8" aria-busy role="status" aria-label="Chargement du bilan">
      <div className="animate-pulse rounded-[28px] p-5 md:p-7 bg-[#03161b]/60 border border-white/5">
        <div className="h-9 md:h-11 w-2/3 max-w-xs rounded-xl bg-white/10 mb-3" />
        <div className="h-4 w-1/2 max-w-sm rounded bg-white/[0.07] mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="h-64 rounded-[22px] bg-white/[0.05] border border-white/10" />
          <div className="h-64 rounded-[22px] bg-white/[0.05] border border-white/10" />
          <div className="h-64 rounded-[22px] bg-white/[0.05] border border-white/10 hidden md:block" />
        </div>
        <div className="h-44 rounded-[22px] bg-white/[0.05] border border-white/10 mt-3 md:mt-4" />
      </div>
    </div>
  );
}

