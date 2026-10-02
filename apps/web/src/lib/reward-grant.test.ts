import { describe, expect, it } from 'vitest';
import { grantMessage } from './reward-grant';

describe('grantMessage', () => {
  it.each([
    [{ status: 'APPLIED', channel: 'stripe' }, /prochaine facture/],
    [{ status: 'APPLIED', channel: 'checkout' }, /déduit de ta souscription/],
    [{ status: 'PENDING', channel: 'deferred' }, /prochaine souscription sur le web/],
    [{ status: 'PENDING', channel: null }, /en cours d’application/],
    [{ status: 'STORE_MANUAL', channel: 'store' }, /iPhone ou Android/],
    [{ status: 'FAILED', channel: 'stripe' }, /notre équipe s’en occupe/],
  ] as const)('%o', (g, re) => expect(grantMessage(g)).toMatch(re));
  it('sans crédit encore créé', () => expect(grantMessage(null)).toMatch(/en cours/));
});
