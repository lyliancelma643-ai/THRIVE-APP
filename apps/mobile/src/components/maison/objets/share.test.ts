import { describe, expect, it, vi } from 'vitest';
import { printObject, shareObjectImage, type ObjectShareDeps } from './share';

const HTML = '<p>carte</p>';

function deps(over: Partial<ObjectShareDeps> = {}): ObjectShareDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    print: vi.fn(async () => { calls.push('print'); }),
    capture: vi.fn(async () => { calls.push('capture'); return 'file:///tmp/carte.png'; }),
    isSharingAvailable: vi.fn(async () => true),
    share: vi.fn(async () => { calls.push('share'); }),
    ...over,
  };
}

describe('Imprimer', () => {
  it('ouvre la feuille d’impression avec le HTML de la carte', async () => {
    const d = deps();
    expect(await printObject(HTML, d)).toBe('done');
    expect(d.print).toHaveBeenCalledWith(HTML);
  });
  it('rien à imprimer (lettre) : aucun appel, aucune erreur', async () => {
    const d = deps();
    expect(await printObject(null, d)).toBe('failed');
    expect(d.print).not.toHaveBeenCalled();
  });
  it('échec ou annulation de la feuille système : pas d’exception', async () => {
    const d = deps({ print: vi.fn(async () => { throw new Error('annulé'); }) });
    await expect(printObject(HTML, d)).resolves.toBe('failed');
  });
});

describe('Enregistrer en image / Partager', () => {
  it('capture puis feuille de partage (qui propose « Enregistrer l’image »)', async () => {
    const d = deps();
    expect(await shareObjectImage(HTML, 'Enregistrer l’image', d)).toBe('done');
    expect(d.calls).toEqual(['capture', 'share']);
    expect(d.share).toHaveBeenCalledWith('file:///tmp/carte.png', 'Enregistrer l’image');
    expect(d.print).not.toHaveBeenCalled();
  });
  it('sans isAvailableAsync (module absent) : repli sur l’impression, pas de crash', async () => {
    const d = deps({ isSharingAvailable: undefined });
    expect(await shareObjectImage(HTML, 'Partager', d)).toBe('printed');
    expect(d.capture).not.toHaveBeenCalled();
    expect(d.share).not.toHaveBeenCalled();
    expect(d.print).toHaveBeenCalledWith(HTML);
  });
  it('partage indisponible sur la plateforme : repli sur l’impression', async () => {
    const d = deps({ isSharingAvailable: vi.fn(async () => false) });
    expect(await shareObjectImage(HTML, 'Partager', d)).toBe('printed');
    expect(d.share).not.toHaveBeenCalled();
  });
  it('isAvailableAsync qui lève : traité comme indisponible', async () => {
    const d = deps({ isSharingAvailable: vi.fn(async () => { throw new Error('boom'); }) });
    await expect(shareObjectImage(HTML, 'Partager', d)).resolves.toBe('printed');
  });
  it('capture impossible : repli sur l’impression', async () => {
    const d = deps({ capture: vi.fn(async () => { throw new Error('card-not-mounted'); }) });
    expect(await shareObjectImage(HTML, 'Partager', d)).toBe('printed');
  });
  it('tout échoue : résultat « failed », jamais d’exception', async () => {
    const d = deps({
      isSharingAvailable: undefined,
      print: vi.fn(async () => { throw new Error('pas d’imprimante'); }),
    });
    await expect(shareObjectImage(HTML, 'Partager', d)).resolves.toBe('failed');
  });
});
