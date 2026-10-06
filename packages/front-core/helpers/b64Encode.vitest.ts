import { describe, expect, it } from 'vitest';
import b64Encode from 'helpers/b64Encode';
import b64ToUtf8 from 'helpers/b64ToUtf8';

describe('b64Encode', () => {
  it('round-trips a UTF-8 string through b64ToUtf8', () => {
    expect(b64ToUtf8(b64Encode('Привіт'))).toBe('Привіт');
  });
});
