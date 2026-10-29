import { describe, expect, it, vi } from 'vitest';
import { goBack } from './goBack';

describe('goBack', () => {
  it('revient en arrière quand une histoire existe', () => {
    const r = { canGoBack: () => true, back: vi.fn(), replace: vi.fn() };
    goBack(r, '/(parent)/maison');
    expect(r.back).toHaveBeenCalled();
    expect(r.replace).not.toHaveBeenCalled();
  });
  it('utilise le repli sans histoire', () => {
    const r = { canGoBack: () => false, back: vi.fn(), replace: vi.fn() };
    goBack(r, '/(parent)/maison');
    expect(r.replace).toHaveBeenCalledWith('/(parent)/maison');
    expect(r.back).not.toHaveBeenCalled();
  });
});
