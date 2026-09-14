import { describe, expect, it } from 'vitest';
import b64ToUtf8 from 'helpers/b64ToUtf8';

describe('b64ToUtf8', () => {
  it('decodes a base64-encoded UTF-8 string', () => {
    expect(b64ToUtf8(window.btoa(unescape(encodeURIComponent('Привіт'))))).toBe('Привіт');
  });
});
