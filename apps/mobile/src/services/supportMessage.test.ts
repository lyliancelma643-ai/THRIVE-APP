// Lancer (vitest de l'app web) : cd apps/web && npx vitest run --root ../mobile src/services/supportMessage.test.ts
import { describe, expect, it } from 'vitest';
import { buildUpgradeSupportMessage, parentNameFrom, supportThreadDraft } from './supportMessage';

describe('buildUpgradeSupportMessage', () => {
  it('pré-remplit l’objet et le corps pour un passage depuis Maison', () => {
    const m = buildUpgradeSupportMessage({
      currentPack: 'Maison',
      targetPack: 'Individuel ou Complet',
      childName: 'Emma',
      parentName: 'Marie Tremblay',
      parentEmail: 'marie@example.com',
    });
    expect(m.subject).toBe('Changement de forfait : Maison vers Individuel ou Complet');
    expect(m.body).toContain('forfait Maison pour Emma');
    expect(m.body).toContain('passer au forfait Individuel ou Complet');
    expect(m.body).toContain('Nom : Marie Tremblay');
    expect(m.body).toContain('Courriel : marie@example.com');
    expect(m.body.startsWith('Bonjour,')).toBe(true);
    expect(m.body.endsWith('Merci !')).toBe(true);
  });

  it('utilise Maison par défaut et omet les lignes sans donnée', () => {
    const m = buildUpgradeSupportMessage({ targetPack: 'Complet', parentName: '  ', parentEmail: null, childName: null });
    expect(m.subject).toContain('Maison vers Complet');
    expect(m.body).toContain('forfait Maison.');
    expect(m.body).not.toContain('Maison pour');
    expect(m.body).not.toContain('Nom :');
    expect(m.body).not.toContain('Courriel :');
  });

  it('gère une simple question quand aucun forfait cible n’est demandé', () => {
    const m = buildUpgradeSupportMessage({ currentPack: 'Maison', targetPack: null });
    expect(m.subject).toBe('Question sur mon forfait Maison');
    expect(m.body).toContain('j’ai une question');
    expect(m.body).not.toContain('passer au forfait');
  });

  it('ne contient aucun identifiant de compte en plus du courriel fourni', () => {
    const m = buildUpgradeSupportMessage({ targetPack: 'Complet', parentEmail: 'a@b.ca' });
    expect(m.body.match(/@/g)?.length).toBe(1);
  });
});

describe('parentNameFrom', () => {
  it('assemble prénom et nom, ou renvoie null', () => {
    expect(parentNameFrom({ firstName: 'Marie', lastName: 'Tremblay' })).toBe('Marie Tremblay');
    expect(parentNameFrom({ firstName: 'Marie' })).toBe('Marie');
    expect(parentNameFrom({ firstName: ' ', lastName: undefined })).toBeNull();
    expect(parentNameFrom(null)).toBeNull();
  });
});

describe('supportThreadDraft', () => {
  it('place l’objet en tête du brouillon du fil Support', () => {
    const d = supportThreadDraft({ subject: 'Sujet', body: 'Corps' });
    expect(d).toBe('Objet : Sujet\n\nCorps');
  });
});
