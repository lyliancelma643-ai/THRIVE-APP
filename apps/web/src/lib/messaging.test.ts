import { describe, expect, it } from 'vitest';
import {
  ATTACHMENT_MAX_BYTES,
  attachmentError,
  dayLabel,
  humanFileSize,
  initials,
  isImageAttachment,
  listTime,
  messagingErrorLabel,
  othersLastRead,
} from './messaging';

// Fabrique un File sans dépendre du DOM (Node 18+ expose File globalement).
function file(name: string, type: string, size: number): File {
  const f = new File([''], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('accusé de lecture — dernière lecture des AUTRES participants', () => {
  const me = 'moi';

  it('ignore ma propre lecture (sinon tout message serait « lu » à l’envoi)', () => {
    const reads = [{ user_id: me, last_read_at: '2026-08-03T12:00:00Z' }];
    expect(othersLastRead(reads, me)).toBe(0);
  });

  it('retient la lecture la plus récente parmi les autres (support multi-agents)', () => {
    const reads = [
      { user_id: me, last_read_at: '2026-08-03T12:00:00Z' },
      { user_id: 'agent-1', last_read_at: '2026-08-03T09:00:00Z' },
      { user_id: 'agent-2', last_read_at: '2026-08-03T11:30:00Z' },
    ];
    expect(othersLastRead(reads, me)).toBe(new Date('2026-08-03T11:30:00Z').getTime());
  });

  it('sans aucune lecture, rien n’est marqué lu', () => {
    expect(othersLastRead([], me)).toBe(0);
  });
});

describe('pièces jointes — garde-fous avant l’envoi', () => {
  it('refuse un fichier plus lourd que la limite du bucket', () => {
    expect(attachmentError(file('photo.png', 'image/png', ATTACHMENT_MAX_BYTES + 1))).toMatch(
      /trop lourd/i
    );
  });

  it('refuse un type non prévu par le bucket (le serveur refuserait aussi)', () => {
    expect(attachmentError(file('archive.zip', 'application/zip', 1000))).toMatch(/image ou PDF/i);
  });

  it('accepte une image et un PDF dans la limite', () => {
    expect(attachmentError(file('photo.jpg', 'image/jpeg', 500_000))).toBeNull();
    expect(attachmentError(file('facture.pdf', 'application/pdf', 500_000))).toBeNull();
  });

  it('distingue une image d’un document pour le rendu de la bulle', () => {
    expect(isImageAttachment('image/webp')).toBe(true);
    expect(isImageAttachment('application/pdf')).toBe(false);
    expect(isImageAttachment(null)).toBe(false);
  });

  it('affiche un poids lisible', () => {
    expect(humanFileSize(512)).toBe('512 o');
    expect(humanFileSize(2048)).toBe('2 Ko');
    expect(humanFileSize(3 * 1024 * 1024)).toBe('3.0 Mo');
    expect(humanFileSize(null)).toBe('');
  });
});

describe('repères de temps du fil', () => {
  it('nomme le jour courant et la veille', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    expect(dayLabel(now.toISOString())).toBe("Aujourd'hui");
    expect(dayLabel(yesterday.toISOString())).toBe('Hier');
  });

  it('donne l’heure pour aujourd’hui et la date sinon, dans les listes', () => {
    const now = new Date();
    // Le séparateur horaire varie selon l'implémentation d'Intl (« 15:56 » dans
    // le navigateur, « 15 h 56 » sous Node) : on n'assure que la forme.
    expect(listTime(now.toISOString())).toMatch(/^\d{1,2}\s?\D{1,3}\s?\d{2}$/);
    expect(listTime('2020-03-04T10:00:00Z')).toMatch(/\d{1,2}\s+\p{L}+/u);
    expect(listTime(null)).toBe('');
  });
});

describe('libellés', () => {
  it('donne des initiales sur un nom simple ou composé', () => {
    expect(initials('Camille Tremblay')).toBe('CT');
    expect(initials('Support')).toBe('S');
    expect(initials(null)).toBe('?');
  });

  it('traduit les codes d’erreur des RPC en phrases pour l’usager', () => {
    expect(messagingErrorLabel('FEATURE_LOCKED')).toMatch(/forfait/i);
    expect(messagingErrorLabel('NO_COACH')).toMatch(/coach/i);
  });
});
