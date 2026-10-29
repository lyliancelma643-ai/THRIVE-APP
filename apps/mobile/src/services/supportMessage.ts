// Message de demande de changement de forfait, pré-rempli pour le support THRIVE.
// Module pur (testé) : ni React ni Linking ici. Sert au courriel (mailto) et au fil Support in-app
// (brouillon du composeur) : le parent n'a qu'à toucher « Envoyer ».

export type UpgradeSupportInput = {
  /** Forfait actuel du parent, ex. « Maison ». */
  currentPack?: string;
  /** Forfait demandé, ex. « Individuel ou Complet ». `null` = simple question sur le forfait. */
  targetPack: string | null;
  /** Prénom de l'enfant concerné, si connu. */
  childName?: string | null;
  /** Nom du parent (prénom + nom), si connu. */
  parentName?: string | null;
  /** Courriel du parent (compte), si connu. */
  parentEmail?: string | null;
};

export type SupportMessage = { subject: string; body: string };

const clean = (v: string | null | undefined): string | null => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t : null;
};

/** Nom affichable depuis le profil d'authentification (prénom + nom), ou null. */
export function parentNameFrom(user: { firstName?: string | null; lastName?: string | null } | null | undefined): string | null {
  const full = [clean(user?.firstName), clean(user?.lastName)].filter(Boolean).join(' ');
  return full || null;
}

export function buildUpgradeSupportMessage(input: UpgradeSupportInput): SupportMessage {
  const currentPack = clean(input.currentPack) ?? 'Maison';
  const target = clean(input.targetPack);
  const child = clean(input.childName);
  const name = clean(input.parentName);
  const email = clean(input.parentEmail);
  const who = child ? ` pour ${child}` : '';

  const subject = target ? `Changement de forfait : ${currentPack} vers ${target}` : `Question sur mon forfait ${currentPack}`;

  const opening = target
    ? `Bonjour,\n\nJe suis actuellement inscrit au forfait ${currentPack}${who}. J’aimerais passer au forfait ${target}. Pouvez-vous me recontacter pour organiser ce changement ?`
    : `Bonjour,\n\nJe suis actuellement inscrit au forfait ${currentPack}${who} et j’ai une question à ce sujet.`;

  const signature = [
    name ? `Nom : ${name}` : null,
    email ? `Courriel : ${email}` : null,
  ].filter((l): l is string => l !== null);

  const body = [opening, ...(signature.length ? ['', ...signature] : []), '', 'Merci !'].join('\n');
  return { subject, body };
}

/** Texte du fil Support in-app : objet en première ligne, puis le corps. */
export function supportThreadDraft(msg: SupportMessage): string {
  return `Objet : ${msg.subject}\n\n${msg.body}`;
}
