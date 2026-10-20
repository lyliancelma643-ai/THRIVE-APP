import { describe, it, expect } from 'vitest';
import { mobileTargetForPath } from './notificationRoute';

describe('mobileTargetForPath', () => {
  it('bilans avec enfant et carte', () => {
    expect(mobileTargetForPath('/parent/bilans?child=abc&focus=competences')).toEqual({
      pathname: '/(parent)/bilans',
      params: { child: 'abc', focus: 'competences' },
    });
  });
  it('messages et séances', () => {
    expect(mobileTargetForPath('/parent/messages')?.pathname).toBe('/(parent)/messages');
    expect(mobileTargetForPath('/parent/my-sessions')?.pathname).toBe('/(parent)/seances');
  });
  it('jamais vers une offre ou un chemin inconnu', () => {
    expect(mobileTargetForPath('/parent/upgrade')).toBeNull();
    expect(mobileTargetForPath('https://x.test/parent/bilans')).toBeNull();
    expect(mobileTargetForPath(undefined)).toBeNull();
  });
});
