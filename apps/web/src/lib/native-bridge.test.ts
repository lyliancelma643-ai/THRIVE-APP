import { describe, expect, it } from 'vitest';
import { isNativeApp, nativePlatform, postToNative } from './native-bridge';

describe('native-bridge', () => {
  it('reconnaît le user-agent de la coque', () => {
    expect(isNativeApp('Mozilla/5.0 Mobile ThriveApp/1.0.0 (ios)')).toBe(true);
    expect(nativePlatform('Mozilla/5.0 ThriveApp/1.0 (android)')).toBe('android');
  });
  it('ignore un navigateur ordinaire', () => {
    expect(isNativeApp('Mozilla/5.0 (iPhone) Safari/604.1')).toBe(false);
    expect(nativePlatform('Mozilla/5.0')).toBeNull();
  });
  it('postToNative est inerte hors WebView', () => {
    expect(postToNative({ type: 'open-paywall' })).toBe(false);
  });
});
