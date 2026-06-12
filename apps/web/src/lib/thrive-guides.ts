// Guides de séance THRIVE — générés depuis les documents officiels de la méthode
// (13 séances détaillées par tranche d'âge : objectif, grille d'observation, verbatim).
import type { AgeGroup } from './catalog';

export type SessionGuide = {
  objectif: string;
  indicateurs: string[];
  verbatim?: string;
};

export const SESSION_GUIDES: Record<AgeGroup, Record<number, SessionGuide>> = {
  '8-11': {
    1: {
      objectif: 'Que le jeune se sente vu, valorisé et en sécurité.',
      indicateurs: [
        'Ouverture au contact',
        'Persévérance après erreur',
        'Capacité à raconter son histoire',
        'Sérieux / implication',
        'Régulation observable',
        'Compréhension consignes',
      ],
      verbatim: 'Mon seul travail aujourd\'hui, c\'est d\'apprendre qui tu es. Alors raconte-moi — toi sur la glace, c\'est quoi ?',
    },
    2: {
      objectif: 'Apprendre au jeune à formuler un objectif simple qui dépend de lui (processus), pas du résultat.',
      indicateurs: [
        'Clarté du check-in',
        'Lien avec la séance 1',
        'Compréhension résultat vs processus',
        'Application de l\'objectif en action',
        'Qualité du verbal transfert',
        'Autonomie de l\'engagement final',
      ],
      verbatim: 'Sur 10, aujourd\'hui t\'es où dans ton corps et dans ta tête ?',
    },
    3: {
      objectif: 'Faire vivre une progression de défi maîtrisée pour construire la confiance par l\'expérience de réussite.',
      indicateurs: [
        'Disponibilité au défi',
        'Engagement dans la progression',
        'Capacité à attribuer son succès à ses efforts',
        'Tolérance à l\'erreur',
        'Verbalisation du courage transférable',
        'Autonomie de l\'ancrage final',
      ],
      verbatim: 'Aujourd\'hui, dans ton corps et dans ta tête, tu te sens comment pour essayer un défi ?',
    },
    4: {
      objectif: 'Apprendre à reconnaître ce qui se passe intérieurement pendant l\'action, surtout quand ça devient difficile.',
      indicateurs: [
        'Disponibilité au défi',
        'Tension corporelle observable',
        'Capacité à nommer une émotion',
        'Précision du mot choisi',
        'Capacité à faire un lien hors sport',
        'Compréhension du transfert',
      ],
      verbatim: 'Aujourd\'hui, tu te sens comment pour un défi qui peut être un peu frustrant ?',
    },
    5: {
      objectif: 'Apprendre au jeune à agir sur l\'émotion identifiée en S4 avec une stratégie simple, choisie par lui, pour revenir au calme et au geste.',
      indicateurs: [
        'Rappel de l\'émotion de S4',
        'Engagement dans la répétition',
        'Qualité de la phrase auto-talk',
        'Reprise après erreur',
        'Clarté du lien avec l\'école',
        'Autonomie de l\'ancrage final',
      ],
      verbatim: 'Aujourd\'hui, quand ça devient plus difficile, tu veux apprendre à faire quoi pour te recaler ?',
    },
    6: {
      objectif: 'Apprendre au jeune à faire redescendre son niveau de tension avant une action difficile, sans perdre son énergie ni sa concentration.',
      indicateurs: [
        'Calme de départ',
        'Rythme d\'exécution',
        'Capacité à enchaîner sans casser le rythme',
        'Stabilité dans l\'exécution',
        'Compréhension de l\'outil appris',
        'Autonomie de l\'ancrage final',
      ],
      verbatim: 'Aujourd\'hui, ton corps est plutôt calme, moyen, ou déjà un peu tendu ?',
    },
    7: {
      objectif: 'Faire le point sur les progrès, redonner de l\'autonomie au jeune, et préparer la deuxième moitié du programme.',
      indicateurs: [
        'Motivation actuelle',
        'Capacité d\'auto-évaluation',
        'Capacité à se comparer à soi-même',
        'Faire ma routine avant d\'agir',
        'Transfert observé à la maison / école',
        'Qualité du mini-objectif S8–S13',
      ],
      verbatim: 'Sur 10, où tu te situes aujourd\'hui avec le programme ? Dans ta tête, dans ton corps, et dans ta motivation ?',
    },
    8: {
      objectif: 'Apprendre au jeune à demander de l\'aide de manière concrète, claire et sans honte, puis à reconnaître les personnes sur lesquelles il peut s\'appuyer.',
      indicateurs: [
        'Disponibilité à demander de l\'aide',
        'Clarté du geste coopératif',
        'Qualité des exemples donnés',
        'Acceptation du soutien',
        'Clarté du lien avec la vie quotidienne',
        'Autonomie de l\'ancrage final',
      ],
      verbatim: 'Aujourd\'hui, quand tu bloques, tu fais quoi d\'habitude : tu continues seul, tu demandes, ou tu attends ?',
    },
    9: {
      objectif: 'Apprendre au jeune à ramener son attention avec son focus word quand il est distrait.',
      indicateurs: [
        'Clarté mentale',
        'Fluidité vers le tir',
        'Qualité du retour attentionnel',
        'Réduction visible des distractions F1→F3',
        'Autonomie dans la phrase finale',
        'Autonomie de l\'ancrage final',
      ],
      verbatim: 'Aujourd\'hui, ta tête est plutôt claire, encombrée, ou entre les deux ?',
    },
    10: {
      objectif: 'Apprendre au jeune à se représenter mentalement un geste avant de le faire, de façon claire, sensorielle et utile pour la performance.',
      indicateurs: [
        'Disponibilité à visualiser',
        'Capacité à exécuter après visualisation',
        'Capacité à visualiser de façon précise',
        'Confiance avant exécution',
        'Compréhension de l\'idée centrale',
        'Autonomie de l\'ancrage final',
      ],
      verbatim: 'Aujourd\'hui, quand tu penses à exécuter un geste difficile, tu te sens plutôt prêt, hésitant, ou entre les deux ?',
    },
    11: {
      objectif: 'Faire passer le jeune du statut d\'apprenant accompagné à celui de praticien autonome de ses outils. Il nomme ses 6 outils, explique leur utilité, et remplit la Carte Ma Boîte à Outils qu\'il garde après le programme.',
      indicateurs: [
        'Clarté du jour',
        'Capacité à nommer ses 6 outils',
        'Qualité du remplissage de la carte',
        'Capacité à hiérarchiser ses outils',
        'Capacité à anticiper une situation réelle',
        'Projection post-programme',
      ],
      verbatim: 'Aujourd\'hui, tu te sens plus en mode revue, en mode fierté, ou en mode brouillard ?',
    },
    12: {
      objectif: 'Faire passer le jeune du statut de bénéficiaire de l\'apprentissage à celui de transmetteur capable d\'influencer positivement les autres.',
      indicateurs: [
        'Disposition à guider',
        'Qualité de la consigne donnée',
        'Capacité à expliquer pour aider',
        'Qualité de l\'ajustement',
        'Capacité à relier à d\'autres contextes',
        'Transfert vers d\'autres contextes',
      ],
    },
    13: {
      objectif: 'Clôturer le programme en consolidant l\'identité positive du jeune, validant ses progrès, et ancrant la projection vers l\'après-programme.',
      indicateurs: [
        'Disposition à verbaliser la clôture',
        'Autonomie de passation',
        'Degré d\'appropriation de la lettre',
        'Fermeture émotionnelle saine',
        'Capacité du jeune à se voir dans la continuité',
        'Projection autonome vers l\'après',
      ],
    },
  },
  '12-14': {
    1: {
      objectif: 'Créer une base d\'alliance sécurisante, comprendre qui est le jeune, situer son vécu sportif, identifier ses premières forces, et formuler un rêve de saison qui servira de point d\'ancrage pour tout le programme.',
      indicateurs: [
        'État d\'ouverture au début',
        'Capacité à parler de soi comme joueur',
        'Clarté du rêve de saison',
        'Compréhension du rôle du coach',
        'Clarté de la synthèse finale',
        'Qualité de clôture relationnelle',
      ],
    },
    2: {
      objectif: 'Apprendre au jeune à formuler un objectif SMART orienté vers le processus et la maîtrise — d\'abord dans le sport, puis dans sa vraie vie.',
      indicateurs: [
        'Présence à S1 encore perceptible',
        'Niveau d\'ambition calibrée',
        'Propriété personnelle des deux objectifs',
        'Autonomie dans l\'écriture',
        'Clarté de la direction pour la suite',
        'Propriété personnelle des objectifs',
      ],
    },
    3: {
      objectif: 'Faire vivre au jeune une progression maîtrisée du défi pour construire des expériences de réussite, renforcer sa confiance, et nommer ses forces de courage et de persévérance.',
      indicateurs: [
        'Disponibilité au défi',
        'Persévérance après erreur',
        'Capacité à transférer la force hors sport',
        'Maintien de l\'effort',
        'Clarté de l\'ancrage final',
        'Qualité du transfert hors sport',
      ],
    },
    4: {
      objectif: 'Apprendre au jeune à nommer précisément ce qu\'il ressent pendant l\'action, au moment où l\'émotion monte.',
      indicateurs: [
        'Clarté de l\'état de départ',
        'Capacité à remarquer l\'émotion pendant l\'action',
        'Identification d\'une émotion claire',
        'Qualité du lien avec le vécu réel',
        'Précision du mot émotionnel choisi',
        'Calme relationnel en fin de séance',
      ],
    },
    5: {
      objectif: 'Apprendre au jeune à utiliser une stratégie de recentrage quand l\'émotion monte pendant l\'action — et retrouver son focus plus vite.',
      indicateurs: [
        'Présence au départ',
        'Disponibilité à agir sur l\'émotion',
        'Pertinence de l\'auto-talk choisi',
        'Transfert verbal vers un autre contexte',
        'Pertinence de l\'auto-talk',
        'Transfert hors sport formulé',
      ],
    },
    6: {
      objectif: 'Construire une routine stable de pré-performance — entrer dans un état de disponibilité mentale et corporelle avant d\'agir, répétable sous pression réelle.',
      indicateurs: [
        'Tension de départ',
        'Disponibilité à entrer dans la routine',
        'Qualité de la respiration abdominale',
        'Qualité du scan corporel',
        'Transfert verbal vers un autre contexte',
        'Transfert hors sport formulé',
      ],
    },
    7: {
      objectif: 'Prendre du recul, mesurer ce qui a changé, réapproprier le programme — pas enseigner une nouvelle habileté.',
      indicateurs: [
        'Disponibilité à faire le bilan',
        'Sportif SMART',
        'Cohérence objectif / expérience vécue',
        'Niveau d\'appropriation du programme',
        'Clarté du transfert hors sport',
        'Projection vers la 2e moitié',
      ],
    },
    8: {
      objectif: 'Normaliser la demande d\'aide — apprendre à qui, quand, et comment demander de l\'aide sans se sentir moins fort. Passer d\'une logique de fermeture à une logique de ressource relationnelle.',
      indicateurs: [
        'Ouverture à parler d\'aide',
        'Capacité à nommer des personnes-ressources',
        'Qualité d\'une demande d\'aide formulée',
        'Transfert vers école / maison / équipe',
        'Qualité de la demande formulée',
        'Transfert hors sport formulé',
      ],
    },
    9: {
      objectif: 'Apprendre à ramener son attention là où on veut qu\'elle soit — au lieu de subir les distractions. La concentration n\'est pas ne jamais partir, c\'est revenir plus vite.',
      indicateurs: [
        'Capacité à choisir un focus word pertinent',
        'Utilisation effective du mot pendant l\'exercice',
        'Transfert proposé vers l\'école ou la vie quotidienne',
        'Pertinence du focus word choisi',
        'Compréhension du principe',
        'Transfert hors sport formulé',
      ],
    },
    10: {
      objectif: 'Apprendre à se représenter mentalement le geste avant de l\'exécuter — une simulation précise du mouvement, des sensations et du déroulé technique. Pas "penser positif" de façon vague.',
      indicateurs: [
        'Capacité à générer une image mentale claire',
        'Autonomie dans l\'usage de l\'outil',
        'Autonomie dans l\'usage',
        'Capacité à expliquer quand les utiliser',
        'Degré d\'appropriation personnelle du vocabulaire',
        'Sentiment de compétence indépendante du coach',
      ],
    },
    11: {
      objectif: 'Consolider, nommer et s\'approprier tout ce qui a été appris. Le jeune devient l\'expert de son propre système — pas un participant qui répète le discours du coach.',
      indicateurs: [
        'Capacité à nommer ses outils sans aide',
        'Capacité à expliquer quand les utiliser',
        'Qualité des liens hors sport',
        'Degré d\'appropriation personnelle du vocabulaire',
        'Niveau de préparation à la fin du programme',
        'Sentiment de compétence indépendante du coach',
      ],
    },
    12: {
      objectif: 'Faire passer le jeune du statut de bénéficiaire de l\'apprentissage à celui de transmetteur capable d\'influencer positivement les autres.',
      indicateurs: [
        'Disposition à guider',
        'Qualité de la consigne donnée',
        'Capacité à expliquer pour aider',
        'Qualité de l\'ajustement',
        'Capacité à relier à d\'autres contextes',
        'Transfert vers d\'autres contextes',
      ],
    },
    13: {
      objectif: 'Clôturer le programme en consolidant l\'identité positive du jeune, validant ses progrès, et ancrant la projection vers l\'après-programme.',
      indicateurs: [
        'Disposition à verbaliser la clôture',
        'Autonomie de passation',
        'Degré d\'appropriation de la lettre',
        'Fermeture émotionnelle saine',
        'Capacité du jeune à se voir dans la continuité',
        'Projection autonome vers l\'après',
      ],
    },
  },
  '15-17': {
    1: {
      objectif: 'Créer une relation crédible avec un adolescent en phase d\'investissement — comprendre son univers sportif et personnel, poser un cadre de travail clair et respectueux, récolter les premières données diagnostiques.',
      indicateurs: [
        'Qualité de l\'alliance initiale',
        'Niveau d\'ouverture du jeune',
        'Clarté du rêve de saison',
        'Première compréhension du cadre THRIVE',
      ],
    },
    2: {
      objectif: 'Transformer le désir vague de progresser en plan clair, personnel et mesurable — co-construit par le jeune, signé par le jeune, appartenant au jeune.',
      indicateurs: [
        'Objectif technique SMART',
        'Objectif life skill pour la saison',
        'Qualité de l\'objectif formulé',
        'Niveau d\'autonomie dans le choix',
        'Clarté du lien avec la vie quotidienne',
        'Qualité de l\'engagement final',
      ],
    },
    3: {
      objectif: 'Faire vivre au jeune une expérience de maîtrise réelle dans un contexte contrôlé — pour qu\'il commence à croire plus solidement en sa capacité à affronter le défi et réinterprète la difficulté comme une opportunité de progression.',
      indicateurs: [
        'Tolérance à l\'effort',
        'Capacité à rester engagé après erreur',
        'Qualité de l\'attribution interne',
        'Clarté des forces nommées',
      ],
    },
    4: {
      objectif: 'Apprendre au jeune à reconnaître ce qu\'il ressent pendant un défi réel, au moment où l\'émotion monte — passer de l\'expérience brute à une identification simple, précise et exploitable.',
      indicateurs: [
        'Capacité à nommer l\'émotion',
        'Précision du vocabulaire émotionnel',
        'Lien émotion-corps',
        'Ouverture au débriefing',
      ],
    },
    5: {
      objectif: 'Apprendre au jeune à faire redescendre la charge émotionnelle pendant l\'action pour rester fonctionnel — passer du constat à l\'intervention avec deux outils concrets : respiration 4-7-8 et auto-talk personnel.',
      indicateurs: [
        'Rapidité de retour à l\'action après perturbation',
        'Qualité de l\'utilisation de la respiration',
        'Pertinence de l\'auto-talk choisi',
        'Clarté du transfert hors sport',
      ],
    },
    6: {
      objectif: 'Faire comprendre au jeune que demander de l\'aide n\'est pas un signe de faiblesse, mais une compétence de développement — déplacer la logique "je dois tout faire seul" vers "je peux m\'appuyer stratégiquement sur des ressources autour de moi".',
      indicateurs: [
        'Facilité à coopérer pendant l\'exercice',
        'Capacité à identifier des personnes-ressources',
        'Qualité de la formulation de demande',
        'Clarté du plan de transfert',
      ],
    },
    7: {
      objectif: 'Faire un arrêt sur image pour mesurer les progrès, ajuster la trajectoire, et remettre le jeune aux commandes de son propre programme pour la deuxième moitié.',
      indicateurs: [
        'Qualité de l\'auto-évaluation',
        'Autonomie dans les choix',
        'Clarté du cap pour la suite',
        'Cohérence progrès perçu / LSSS',
      ],
    },
    8: {
      objectif: 'Approfondir la compétence de demande d\'aide — pas juste identifier des personnes-ressources, mais agir concrètement avant d\'être au bout du rouleau, et distinguer l\'aide qui renforce l\'autonomie de l\'aide qui l\'empêche.',
      indicateurs: [
        'Différenciation types d\'aide',
        'Compréhension aide qui renforce vs dépend',
        'Qualité de la formulation de demande',
        'Clarté du plan de transfert',
      ],
    },
    9: {
      objectif: 'Donner au jeune un outil simple pour revenir au geste quand des pensées parasites, la pression ou l\'auto-critique apparaissent — pas une concentration parfaite, mais une capacité à revenir vite au bon focus.',
      indicateurs: [
        'Qualité du focus word choisi',
        'Force de l\'ancrage sensoriel',
        'Vitesse de retour attentionnel (R3 vs R1)',
        'Clarté du plan de transfert',
      ],
    },
    10: {
      objectif: 'Enseigner au jeune comment se préparer mentalement avant d\'exécuter un geste difficile — une répétition interne du mouvement qui active la préparation motrice sans effort physique complet.',
      indicateurs: [
        'Qualité de l\'imagerie (précision sensorielle)',
        'Transition guidé → autonome',
        'Effet perçu sur l\'exécution',
        'Clareté du plan de transfert',
      ],
    },
    11: {
      objectif: 'Faire passer le jeune de l\'accumulation d\'apprentissages à une vision intégrée de ses outils personnels — il nomme ses 6 outils THRIVE, les reformule avec ses mots, et explique dans quel contexte de vie il les utilise.',
      indicateurs: [
        'Capacité à nommer les 6 outils',
        'Richesse des transferts hors sport',
        'Force de la phrase identitaire',
        'Appropriation visible de la carte',
      ],
    },
    12: {
      objectif: 'Faire expérimenter au jeune qu\'il peut influencer positivement quelqu\'un d\'autre — pas dominer ou performer, mais guider, démontrer et soutenir de manière utile.',
      indicateurs: [
        'Aisance dans le rôle de guide',
        'Clarté et patience dans la guidance',
        'Capacité à observer l\'effet produit',
        'Force de la phrase identitaire S12',
      ],
    },
    13: {
      objectif: 'Transformer la fin du programme en expérience de sens — pas un arrêt administratif. Le jeune voit noir sur blanc ce qu\'il a appris, ce qu\'il a gagné, et ce qu\'il peut continuer à utiliser seul.',
      indicateurs: [
        'Conscience du progrès accompli',
        'Qualité de la lettre (profondeur, hônneté)',
        'Réception émotionnelle de la célébration',
        'Sentiment de continuité à la sortie',
      ],
    },
  },
};
