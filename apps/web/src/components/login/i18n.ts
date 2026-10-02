// Textes de l'écran d'accueil / connexion, en français et en anglais.
// Le choix de langue est mémorisé (localStorage `thrive-lang`) et posé sur
// <html lang> le temps de la visite. Le reste de l'app reste en français.

export type Lang = 'fr' | 'en';

export const LANG_KEY = 'thrive-lang';

// Valeurs enregistrées en base (inchangées, en français) et leur libellé anglais.
export const SPORTS: { value: string; en: string }[] = [
  { value: 'Hockey', en: 'Hockey' },
  { value: 'Soccer', en: 'Soccer' },
  { value: 'Basketball', en: 'Basketball' },
  { value: 'Natation', en: 'Swimming' },
  { value: 'Tennis', en: 'Tennis' },
  { value: 'Volleyball', en: 'Volleyball' },
  { value: 'Gymnastique', en: 'Gymnastics' },
  { value: 'Arts martiaux', en: 'Martial arts' },
  { value: 'Baseball', en: 'Baseball' },
  { value: 'Patinage', en: 'Skating' },
  { value: 'Football', en: 'Football' },
  { value: 'Athlétisme', en: 'Track & field' },
  { value: 'Autre', en: 'Other' },
];

const fr = {
  langLabel: 'Langue',
  brandAlt: 'THRIVE Sport Positive',
  srTitle: 'Espace membres THRIVE Sport Positive',
  backSite: 'Retour au site',
  back: 'Retour',
  redirecting: 'Redirection vers ton espace…',

  // Accueil
  heroAlt: 'La mascotte THRIVE, un petit bouc à houppette jaune, te fait signe',
  bubble: 'On grandit ensemble ?',
  eyebrow: 'Thrive · Sport Positive',
  slogan1: 'Grandir par le sport,',
  slogan2: 'réussir pour la vie.',
  pitch:
    'Séances avec un coach, bilans et moments à la maison — pour les athlètes de 8 à 17 ans et leurs parents.',
  pitchWide: 'L’accompagnement sport positif des athlètes de 8 à 17 ans — et de leurs parents.',
  feat1: 'Séances avec un coach',
  feat2: 'Bilans de progression',
  feat3: 'Moments à la maison',
  ctaCreate: 'Créer mon compte',
  ctaHave: 'J’ai déjà un compte',

  // Onglets (ordinateur)
  modeLabel: 'Connexion ou inscription',
  tabSignin: 'Se connecter',
  tabSignup: 'Créer un compte',

  // Connexion
  familySpace: 'Espace famille',
  signinTitle: 'Bon retour !',
  signinSub: 'Ton espace t’attend, bien à l’abri.',
  signinAlt: 'La mascotte THRIVE tient un bouclier devant une famille',
  email: 'Adresse email',
  emailPh: 'ton@email.com',
  password: 'Mot de passe',
  forgotShort: 'Oublié ?',
  showPw: 'Afficher le mot de passe',
  hidePw: 'Masquer le mot de passe',
  signin: 'Se connecter',
  signingIn: 'Connexion…',
  newHere: 'Nouveau chez THRIVE ?',
  createAccount: 'Créer un compte',
  secure: 'Connexion sécurisée · double authentification disponible',

  // Inscription — étape 1
  step1: 'Étape 1 sur 2',
  step2: 'Étape 2 sur 2',
  signupEyebrow: 'Créer un compte',
  parentTitle: 'Toi d’abord.',
  parentSub: 'Ton athlète juste après. Ça prend une minute.',
  parentAlt: 'La mascotte THRIVE, entourée d’étoiles, se demande : moi ?',
  firstName: 'Prénom',
  lastName: 'Nom',
  pwHint: '8 caractères minimum',
  pwLevels: ['', 'Trop court', 'Correct', 'Solide', 'Excellent'],
  next: 'Continuer',
  legal: 'En créant ton compte, tu acceptes nos conditions d’utilisation et notre politique de confidentialité.',
  haveAccount: 'Déjà un compte ?',

  // Inscription — étape 2
  athleteEyebrow: 'Ton athlète',
  athleteTitle: 'Qui grandit avec nous ?',
  athleteSub: 'Tu pourras en ajouter d’autres plus tard.',
  athleteAlt: 'La mascotte THRIVE devant un mur de sports cochés : c’est moi !',
  child: 'Enfant',
  childFirst: 'Prénom de l’enfant',
  childFirstPh: 'Léo',
  age: 'Âge',
  ageHint: 'De 8 à 17 ans',
  years: 'ans',
  younger: 'Un an de moins',
  older: 'Un an de plus',
  sport: 'Sport principal',
  removeChild: 'Retirer cet enfant',
  addChild: 'Ajouter un autre enfant',
  createMine: 'Créer mon compte',
  creating: 'Création du compte…',
  skip: 'Passer cette étape',

  // Compte créé
  readyAlt: 'La mascotte THRIVE, chapeau de fête sur la tête, rit sous les confettis',
  readyBadge: 'Compte créé',
  ready1: 'Bienvenue',
  ready2: 'dans l’équipe !',
  readySub:
    'Ton espace famille est prêt. Première étape : le bilan de ton athlète — quelques minutes, à faire ensemble.',
  readySubNoChild: 'Ton espace famille est prêt. Ajoute ton athlète pour lancer son premier bilan.',
  readyCta: 'Commencer le bilan',
  readyCtaNoChild: 'Ajouter mon athlète',
  readyLater: 'Découvrir mon espace d’abord',

  // Mot de passe oublié
  forgotAlt: 'La mascotte THRIVE glisse une lettre au cœur rouge',
  forgotTitle: 'Mot de passe oublié ?',
  forgotSub: 'Pas de souci. Entre ton email : on t’envoie un lien pour en choisir un nouveau.',
  sendLink: 'Envoyer le lien',
  sending: 'Envoi…',
  sentTitle: 'Regarde ta boîte mail',
  sentSub: (email: string) =>
    `Si un compte existe pour ${email}, un lien t’attend. Pense à jeter un œil aux indésirables.`,
  resend: 'Renvoyer l’email',
  backToSignin: 'Retour à la connexion',

  // Confirmation d'e-mail (Loi 25)
  confirmAlt: 'La mascotte THRIVE glisse une lettre au cœur rouge',
  confirmTitle: 'Confirme ton adresse e-mail',
  confirmSub: (email: string) =>
    `Nous avons envoyé un lien à ${email}. Clique dessus pour activer ton compte (pense à vérifier tes indésirables).`,
  confirmChildren: 'Tes enfants seront ajoutés automatiquement à ta première connexion.',
  confirmNote: 'Un lien de confirmation te sera envoyé par e-mail pour activer ton compte.',
  iConfirmed: 'J’ai confirmé — me connecter',
  resendLink: 'Renvoyer le lien',
  resendConfirm: 'Renvoyer le lien de confirmation',
  resendIn: (n: number) => `Renvoyer le lien (${n} s)`,
  resentIn: (n: number) => `Lien renvoyé (${n} s)`,
  resendAgain: 'Renvoyer encore',
  linkSent: 'Nouveau lien envoyé.',
  errNotConfirmed: 'Ton adresse e-mail n’est pas encore confirmée. Clique sur le lien reçu par e-mail.',
  errResendRate: 'Un e-mail vient déjà d’être envoyé. Réessaie dans une minute.',

  // /auth/confirm
  confirming: 'Confirmation de ton adresse…',
  confirmingAria: 'Confirmation en cours',
  linkExpiredTitle: 'Lien expiré ou déjà utilisé',
  linkExpiredSub: 'Si ton adresse est déjà confirmée, connecte-toi. Sinon, reçois un nouveau lien\u00a0:',
  newLinkTitle: 'Nouveau lien envoyé',
  newLinkSub: (email: string) =>
    `Ouvre l’e-mail reçu sur ${email} et clique sur le lien (pense à vérifier tes indésirables).`,
  errResend: 'Envoi impossible. Vérifie l’adresse et réessaie.',

  // Messages
  disabled: 'Ton compte a été désactivé. Contacte un administrateur pour le réactiver.',
  errRequired: 'Tous les champs sont requis.',
  errEmailRequired: 'Entre ton adresse email.',
  errEmail: 'L’adresse email n’est pas valide.',
  errPwShort: 'Le mot de passe doit faire au moins 8 caractères.',
  errCredentials: 'Email ou mot de passe incorrect.',
  errNetwork: 'Connexion lente ou interrompue. Vérifie ton réseau et réessaie.',
  errExists: 'Un compte existe déjà avec cet email.',
  errRate: 'Trop de tentatives. Réessaie dans quelques minutes.',
  errWeak: 'Mot de passe trop faible (min. 8 caractères).',
  errSignin: 'Connexion impossible.',
  errSignup: 'Inscription impossible.',
  errSendMail: 'Envoi de l’email impossible.',
  errAfterSignup: 'Connexion impossible après inscription.',
  errChildName: (n: number) => `Ajoute le prénom de l’enfant ${n}, ou retire-le.`,
};

export type Dict = typeof fr;

const en: Dict = {
  langLabel: 'Language',
  brandAlt: 'THRIVE Sport Positive',
  srTitle: 'THRIVE Sport Positive members area',
  backSite: 'Back to website',
  back: 'Back',
  redirecting: 'Taking you to your space…',

  heroAlt: 'The THRIVE mascot, a little goat with a yellow tuft, waving at you',
  bubble: 'Shall we grow together?',
  eyebrow: 'Thrive · Sport Positive',
  slogan1: 'Grow through sport,',
  slogan2: 'succeed for life.',
  pitch:
    'Coach sessions, progress reports and at-home moments — for athletes aged 8 to 17 and their parents.',
  pitchWide: 'Positive sport coaching for athletes aged 8 to 17 — and their parents.',
  feat1: 'Coach sessions',
  feat2: 'Progress reports',
  feat3: 'At-home moments',
  ctaCreate: 'Create my account',
  ctaHave: 'I already have an account',

  modeLabel: 'Sign in or sign up',
  tabSignin: 'Sign in',
  tabSignup: 'Create an account',

  familySpace: 'Family space',
  signinTitle: 'Welcome back!',
  signinSub: 'Your space is waiting, safe and sound.',
  signinAlt: 'The THRIVE mascot holding a shield in front of a family',
  email: 'Email address',
  emailPh: 'you@email.com',
  password: 'Password',
  forgotShort: 'Forgot it?',
  showPw: 'Show password',
  hidePw: 'Hide password',
  signin: 'Sign in',
  signingIn: 'Signing in…',
  newHere: 'New to THRIVE?',
  createAccount: 'Create an account',
  secure: 'Secure sign-in · two-factor authentication available',

  step1: 'Step 1 of 2',
  step2: 'Step 2 of 2',
  signupEyebrow: 'Create an account',
  parentTitle: 'You first.',
  parentSub: 'Your athlete right after. It takes a minute.',
  parentAlt: 'The THRIVE mascot, surrounded by stars, wondering: me?',
  firstName: 'First name',
  lastName: 'Last name',
  pwHint: 'At least 8 characters',
  pwLevels: ['', 'Too short', 'Fair', 'Strong', 'Excellent'],
  next: 'Continue',
  legal: 'By creating your account, you agree to our terms of use and privacy policy.',
  haveAccount: 'Already have an account?',

  athleteEyebrow: 'Your athlete',
  athleteTitle: 'Who’s growing with us?',
  athleteSub: 'You can add more later.',
  athleteAlt: 'The THRIVE mascot in front of a wall of ticked sports: that’s me!',
  child: 'Child',
  childFirst: 'Child’s first name',
  childFirstPh: 'Leo',
  age: 'Age',
  ageHint: 'From 8 to 17',
  years: 'yrs',
  younger: 'One year younger',
  older: 'One year older',
  sport: 'Main sport',
  removeChild: 'Remove this child',
  addChild: 'Add another child',
  createMine: 'Create my account',
  creating: 'Creating your account…',
  skip: 'Skip this step',

  readyAlt: 'The THRIVE mascot in a party hat, laughing under confetti',
  readyBadge: 'Account created',
  ready1: 'Welcome',
  ready2: 'to the team!',
  readySub:
    'Your family space is ready. First step: your athlete’s check-in — a few minutes, done together.',
  readySubNoChild: 'Your family space is ready. Add your athlete to start their first check-in.',
  readyCta: 'Start the check-in',
  readyCtaNoChild: 'Add my athlete',
  readyLater: 'Explore my space first',

  forgotAlt: 'The THRIVE mascot slipping a letter with a red heart',
  forgotTitle: 'Forgot your password?',
  forgotSub: 'No worries. Enter your email and we’ll send you a link to choose a new one.',
  sendLink: 'Send the link',
  sending: 'Sending…',
  sentTitle: 'Check your inbox',
  sentSub: (email: string) =>
    `If an account exists for ${email}, a link is waiting for you. Take a look in your spam folder too.`,
  resend: 'Resend the email',
  backToSignin: 'Back to sign in',

  confirmAlt: 'The THRIVE mascot slipping a letter with a red heart',
  confirmTitle: 'Confirm your email address',
  confirmSub: (email: string) =>
    `We sent a link to ${email}. Click it to activate your account (check your spam folder too).`,
  confirmChildren: 'Your children will be added automatically the first time you sign in.',
  confirmNote: 'A confirmation link will be emailed to you to activate your account.',
  iConfirmed: 'I’ve confirmed — sign me in',
  resendLink: 'Resend the link',
  resendConfirm: 'Resend the confirmation link',
  resendIn: (n: number) => `Resend the link (${n} s)`,
  resentIn: (n: number) => `Link resent (${n} s)`,
  resendAgain: 'Resend again',
  linkSent: 'New link sent.',
  errNotConfirmed: 'Your email address isn’t confirmed yet. Click the link we emailed you.',
  errResendRate: 'An email was just sent. Try again in a minute.',

  confirming: 'Confirming your address…',
  confirmingAria: 'Confirmation in progress',
  linkExpiredTitle: 'Link expired or already used',
  linkExpiredSub: 'If your address is already confirmed, sign in. Otherwise, get a new link:',
  newLinkTitle: 'New link sent',
  newLinkSub: (email: string) =>
    `Open the email sent to ${email} and click the link (check your spam folder too).`,
  errResend: 'Unable to send. Check the address and try again.',

  disabled: 'Your account has been deactivated. Contact an administrator to reactivate it.',
  errRequired: 'All fields are required.',
  errEmailRequired: 'Enter your email address.',
  errEmail: 'This email address isn’t valid.',
  errPwShort: 'Your password must be at least 8 characters.',
  errCredentials: 'Incorrect email or password.',
  errNetwork: 'Slow or interrupted connection. Check your network and try again.',
  errExists: 'An account already exists with this email.',
  errRate: 'Too many attempts. Try again in a few minutes.',
  errWeak: 'Password too weak (min. 8 characters).',
  errSignin: 'Unable to sign in.',
  errSignup: 'Unable to sign up.',
  errSendMail: 'Unable to send the email.',
  errAfterSignup: 'Unable to sign in after signing up.',
  errChildName: (n: number) => `Add child ${n}’s first name, or remove them.`,
};

export const DICT: Record<Lang, Dict> = { fr, en };

// Traduit les messages techniques de Supabase en messages lisibles.
export function humanAuthError(msg: string, t: Dict): string {
  if (/invalid login|credentials/i.test(msg)) return t.errCredentials;
  if (/fetch|network|abort|timed? ?out/i.test(msg)) return t.errNetwork;
  if (/already|exist|registered/i.test(msg)) return t.errExists;
  if (/invalid.*email|email.*invalid/i.test(msg)) return t.errEmail;
  if (/rate|too many/i.test(msg)) return t.errRate;
  if (/password/i.test(msg) && /weak|short|least|6|8/i.test(msg)) return t.errWeak;
  return msg;
}
