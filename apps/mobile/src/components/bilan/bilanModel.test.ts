import { describe, it, expect } from 'vitest';
import { buildSeancesModel, pickNextSession, type SessionRow } from './bilanModel';
import { fmtDecimal, groupNotifications, lsssDelta, phaseOfSession, stepsSummary, wellbeing5 } from './bilanData';

const row = (n: number, status: string, extra: Partial<SessionRow> = {}): SessionRow => ({
  id: `s${n}`, session_number: n, title: `T${n}`, status, scheduled_at: null, completed_at: null, ...extra,
});

describe('Mes séances', () => {
  it('la prochaine séance est celle en cours, sinon la première à venir (une manquée se replanifie)', () => {
    expect(pickNextSession([row(1, 'COMPLETED'), row(2, 'MISSED'), row(3, 'SCHEDULED')])?.id).toBe('s2');
    expect(pickNextSession([row(1, 'SCHEDULED'), row(2, 'IN_PROGRESS')])?.id).toBe('s2');
  });
  it('aucun état d’échec : « À replanifier »', () => {
    const m = buildSeancesModel({
      sessions: [row(1, 'COMPLETED', { completed_at: '2026-09-03T12:00:00' }), row(2, 'MISSED')],
      reportSessionNumbers: new Set([1]), coachFirst: 'Lylian', childName: 'X', childOptions: [], activeChildId: null, readonly: false,
    });
    expect(m.done).toBe(1);
    expect(m.items[1].subtitle).toBe('À replanifier');
    expect(m.items[0].hasReport).toBe(true);
    expect(JSON.stringify(m)).not.toMatch(/manquée|échec/i);
  });
  it('pack terminé : seulement les séances validées', () => {
    const m = buildSeancesModel({ sessions: [row(1, 'COMPLETED'), row(2, 'SCHEDULED')], reportSessionNumbers: new Set(), coachFirst: null, childName: 'X', childOptions: [], activeChildId: null, readonly: true });
    expect(m.items.map((i) => i.number)).toEqual([1]);
    expect(m.nextLine).toBeNull();
  });
});

describe('formats du Bilan', () => {
  it('phases', () => {
    expect([1, 2, 3, 10, 11, 13].map(phaseOfSession)).toEqual(['ANCRER', 'ANCRER', 'DEVELOPPER', 'DEVELOPPER', 'INTEGRER', 'INTEGRER']);
  });
  it('bien-être sur 5 et écart LSSS', () => {
    expect(fmtDecimal(wellbeing5(82))).toBe('4,1');
    expect(lsssDelta([{ moment: 'BASELINE', created_at: '', value: 56 }, { moment: 'MID', created_at: '', value: 67 }])).toBe(11);
    expect(lsssDelta([{ moment: 'BASELINE', created_at: '', value: 56 }])).toBeNull();
  });
  it('résumé des étapes', () => {
    expect(stepsSummary([{ status: 'todo' }, { status: 'doing' }, { status: 'done' }])).toBe('1 à faire · 1 en cours · 1 faite');
  });
  it('notifications groupées Aujourd’hui / Cette semaine / Plus tôt', () => {
    const now = new Date(2026, 9, 12, 20);
    const g = groupNotifications([
      { created_at: new Date(2026, 9, 12, 18).toISOString() },
      { created_at: new Date(2026, 9, 9, 18).toISOString() },
      { created_at: new Date(2026, 8, 1, 18).toISOString() },
    ], now);
    expect(g.map((x) => x.bucket)).toEqual(['today', 'week', 'older']);
  });
});
