import { describe, expect, it } from 'vitest';
import type { ErrorEvent, Event } from '@sentry/nextjs';
import { scrubEvent, scrubText, scrubTransaction } from './sentry-scrub';

describe('nettoyage Sentry', () => {
  it('masque courriels, jetons de questionnaire, JWT et session de paiement', () => {
    const s = scrubText(
      'parent@exemple.ca a ouvert /q/0f2c-uuid?x=1 puis /parent/abonnement?checkout=success&session_id=cs_live_123 avec eyJhbGc.eyJzdWIi.sig',
    );
    expect(s).not.toContain('parent@exemple.ca');
    expect(s).not.toContain('0f2c-uuid');
    expect(s).not.toContain('cs_live_123');
    expect(s).not.toContain('eyJhbGc');
    expect(s).toContain('/q/[jeton]');
    expect(s).toContain('checkout=success');
  });

  it("ne garde que l'id utilisateur et retire cookies, corps et en-têtes", () => {
    const e = scrubEvent({
      type: undefined,
      user: { id: 'u1', email: 'a@b.co', ip_address: '1.2.3.4' },
      request: {
        url: 'https://app/q/abc',
        cookies: { 'sb-access-token': 'x' },
        data: { password: 'p' },
        headers: { authorization: 'Bearer x', 'user-agent': 'UA' },
        query_string: 'token=x',
      },
      exception: { values: [{ type: 'Error', value: 'échec pour a@b.co' }] },
    } as ErrorEvent)!;
    expect(e.user).toEqual({ id: 'u1' });
    expect(e.request?.cookies).toBeUndefined();
    expect(e.request?.data).toBeUndefined();
    expect(e.request?.headers).toEqual({ 'user-agent': 'UA' });
    expect(e.request?.url).toBe('https://app/q/[jeton]');
    expect(e.exception?.values?.[0].value).toBe('échec pour [courriel]');
  });

  it('nettoie extra, tags, contexts et les traces (URL des spans, transaction)', () => {
    const e = scrubEvent({
      type: undefined,
      extra: { note: 'parent@exemple.ca', nested: { deep: { a: { b: 'a@b.co' } } } },
      tags: { lien: '/q/abc123' },
      contexts: { page: { url: 'https://app/parent?session_id=cs_live_9' } },
    } as ErrorEvent)!;
    expect(JSON.stringify(e)).not.toContain('parent@exemple.ca');
    expect(JSON.stringify(e)).not.toContain('abc123');
    expect(JSON.stringify(e)).not.toContain('cs_live_9');
    expect(JSON.stringify(e)).not.toContain('a@b.co');

    type Tx = Event & { spans: { description?: string; data?: Record<string, unknown> }[] };
    const t = scrubTransaction({
      transaction: 'GET /q/tok42',
      user: { id: 'u2', email: 'x@y.co' },
      spans: [{ description: 'GET https://api/x?token=secret1', data: { url: '/q/tok99' } }],
    } as unknown as Tx)!;
    expect(t.user).toEqual({ id: 'u2' });
    expect(t.transaction).toBe('GET /q/[jeton]');
    expect(t.spans?.[0].description).toBe('GET https://api/x?token=[masqué]');
    expect(JSON.stringify(t.spans?.[0].data)).not.toContain('tok99');
  });
});
