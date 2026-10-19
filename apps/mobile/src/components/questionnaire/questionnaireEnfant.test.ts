// Lancer : cd apps/mobile && ../web/node_modules/.bin/vitest run src/components/questionnaire
import { describe, expect, it } from 'vitest';
import {
  COPY, SCALES, allAnswered, answeredCount, loadErrorKey, nextIndex, orderItems, outcomeMessage, submitErrorMessage,
  type QuestionnaireItem,
} from './questionnaireEnfant';

const item = (id: string, group: string, n: number): QuestionnaireItem => ({ id, group_key: group, group_label: group, prompt: `q${id}`, sort_order: n });

describe('questionnaire de l’enfant (W)', () => {
  it('chaque échelle a cinq libellés dans les deux langues', () => {
    for (const k of ['PERMA', 'LSSS'] as const) for (const l of ['fr', 'en'] as const) expect(SCALES[k][l]).toHaveLength(5);
  });

  it('regroupe par pilier en gardant l’ordre du serveur dans chaque groupe', () => {
    const ordered = orderItems([item('1', 'A', 1), item('2', 'B', 2), item('3', 'A', 3)]);
    expect(ordered.map((i) => i.id)).toEqual(['1', '3', '2']);
    expect(orderItems(undefined)).toEqual([]);
  });

  it('avance à la prochaine question sans réponse, puis à la fin', () => {
    const items = [item('1', 'A', 1), item('2', 'A', 2), item('3', 'A', 3)];
    expect(nextIndex(items, {}, 0, '1')).toBe(1);
    expect(nextIndex(items, { '1': 3 }, 2, '3')).toBe(1); // revient à la question restante
    expect(nextIndex(items, { '1': 3, '2': 4 }, 1, '3')).toBe(3); // tout est répondu : fin
  });

  it('compte les réponses ; envoi possible seulement si tout est répondu', () => {
    const items = [item('1', 'A', 1), item('2', 'A', 2)];
    expect(answeredCount(items, { '1': 5 })).toBe(1);
    expect(allAnswered(items, { '1': 5 })).toBe(false);
    expect(allAnswered(items, { '1': 5, '2': 1 })).toBe(true);
    expect(allAnswered([], {})).toBe(false);
  });

  it('messages d’erreur : jamais de texte technique', () => {
    const c = COPY.fr;
    expect(loadErrorKey(0)).toBe('network');
    expect(loadErrorKey(503)).toBe('network');
    expect(loadErrorKey(400)).toBe('invalid');
    expect(submitErrorMessage(c, { code: 'incomplete' })).toBe(c.incomplete);
    expect(submitErrorMessage(c, { code: 'already_completed' })).toBe(c.alreadyShort);
    expect(submitErrorMessage(c, { code: 'autre_chose' })).toBe(c.genericErr);
    expect(submitErrorMessage(c, { status: 0 })).toBe(c.network);
    expect(submitErrorMessage(c, { status: 400 })).toBe(c.genericErr);
  });

  it('écran de fin : envoyé, déjà complété (verrou 1 test par séance), expiré, invalide', () => {
    const c = COPY.fr;
    expect(outcomeMessage(c, { done: true })).toEqual({ ok: true, message: c.thanks });
    expect(outcomeMessage(c, { done: false, completed: true })).toEqual({ ok: true, message: c.already });
    expect(outcomeMessage(c, { done: false, error: 'expired' })).toEqual({ ok: false, message: c.expired });
    expect(outcomeMessage(c, { done: false, error: 'network' })).toEqual({ ok: false, message: c.network });
    expect(outcomeMessage(c, { done: false, error: 'x' })).toEqual({ ok: false, message: c.invalid });
  });
});
