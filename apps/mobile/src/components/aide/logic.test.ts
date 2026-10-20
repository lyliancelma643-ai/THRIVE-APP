import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAGE_CONSULTER, PAGE_NON, p3Pool, pickTonight, type Moment } from '../../lib/p3';
import { ageBlocks, consultPage, crisisNumber, linkify, smsUrl, softActivity, telUrl } from './logic';

const pool = p3Pool();
const now = new Date('2026-10-12T20:00:00Z');

describe('K4 · Quand il dit non', () => {
  it('la tranche d’âge de l’enfant est affichée avant les autres', () => {
    for (const b of PAGE_NON.byAge) {
      const { mine, others } = ageBlocks(b.band as '8-11' | '12-14' | '15-17');
      expect(mine?.band).toBe(b.band);
      expect(others.map((o) => o.band)).not.toContain(b.band);
      expect([mine, ...others]).toHaveLength(PAGE_NON.byAge.length);
    }
    expect(ageBlocks('12-14').mine?.text).toBe(PAGE_NON.byAge[1].text);
  });
  it('tranche inconnue : aucun bloc mis en avant, les trois restent dans l’ordre du texte', () => {
    const { mine, others } = ageBlocks(null);
    expect(mine).toBeNull();
    expect(others).toEqual(PAGE_NON.byAge);
  });
  it('pickTonight avec 2 refus change de fiche (fiche anti-refus)', () => {
    // Semaine 1 vécue (il y a longtemps) : le moteur propose la suite du programme sans refus, une fiche anti-refus avec 2 refus.
    const moments: Moment[] = ['ACT-0101', 'ACT-0102', 'ACT-0103'].map((activity_id) => ({
      activity_id, created_at: '2026-08-01T20:00:00Z', duration_chosen: 10, rating: 4,
    }));
    const base = { firstName: 'Test', band: '8-11' as const, moments, pool, now };
    const normal = softActivity({ ...base, refusals: 0 });
    const soft = softActivity(base);
    expect(soft).not.toBeNull();
    expect(soft?.anti_refusal).toBe(true);
    expect(normal?.id).not.toBe(soft?.id);
    // même moteur que le web
    const direct = pickTonight({
      firstName: 'Test', band: '8-11', declaredDuration: 10, place: 'maison', parentEnergy: null, childMood: null,
      moments: [], consecutiveRefusals: 2, now, pool: pool.filter((a) => a.age_bands.includes('8-11')),
    });
    expect(soft?.id).toBe(direct?.activity.id);
  });
  it('la fiche respecte la tranche d’âge de l’enfant', () => {
    for (const band of ['8-11', '12-14', '15-17'] as const) {
      const a = softActivity({ firstName: 'Test', band, moments: [], pool, now });
      if (a) expect(a.age_bands).toContain(band);
    }
  });
});

describe('K5 · Quand consulter', () => {
  const page = consultPage();
  it('aucun statut A_VALIDER ni note de vérification affichés', () => {
    const shown = JSON.stringify(page);
    expect(shown).not.toMatch(/A_VALIDER|À VALIDER|À VÉRIFIER|en validation/i);
    expect(shown).not.toContain(PAGE_CONSULTER.whoToCall.verifyNote);
    expect(Object.keys(page)).not.toContain('status');
  });
  it('boutons d’appel présents, numéro lu dans le texte partagé', () => {
    expect(crisisNumber()).toEqual({ label: '9-8-8', value: '988' });
    expect(page.urgent.callLabel).toBe('Appeler 9-8-8');
    expect(page.urgent.textLabel).toBe('Texto 9-8-8');
    expect(page.urgent.callUrl).toBe(telUrl('988'));
    expect(page.urgent.textUrl).toBe(smsUrl('988'));
  });
  it('textes repris mot pour mot du module partagé', () => {
    expect(page.urgent.text).toBe(PAGE_CONSULTER.urgent.text);
    expect(page.signals.items).toEqual(PAGE_CONSULTER.signals.items);
    expect(page.whoToCall.items).toEqual(PAGE_CONSULTER.whoToCall.items);
    expect(page.inApp).toBe(PAGE_CONSULTER.inApp);
    expect(page.inApp).toMatch(/^Aucune activité de l’app ne mesure/);
  });
  it('lignes du Québec appelables ou textables', () => {
    const all = PAGE_CONSULTER.whoToCall.items.flatMap(linkify).filter((s) => s.kind !== 'text');
    const urls = all.map((s) => (s.kind === 'sms' ? smsUrl(s.value) : telUrl(s.value)));
    expect(urls).toEqual(expect.arrayContaining(['tel:811', 'tel:18002632266', 'sms:5146001002', 'tel:18006686868', 'sms:686868', 'tel:18003615085']));
  });
  it('linkify garde le texte intact', () => {
    for (const t of [PAGE_CONSULTER.urgent.text, ...PAGE_CONSULTER.whoToCall.items]) {
      expect(linkify(t).map((s) => s.text).join('')).toBe(t);
    }
  });
});

describe('pages d’aide : conventions', () => {
  it.each(['PageNonView.tsx', 'PageConsulterView.tsx', 'LinkedText.tsx', 'logic.ts'])('%s : pas de donnée de démo, pas de lien de paiement', (f) => {
    const src = readFileSync(resolve(__dirname, f), 'utf8');
    expect(src).not.toMatch(/Léo|Camille|Tremblay|La cabane impossible|https?:\/\//);
    expect(src).not.toMatch(/stripe|checkout/i);
  });
});
