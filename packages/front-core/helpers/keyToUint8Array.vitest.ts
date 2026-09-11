import { describe, expect, it } from 'vitest';
import keyToUint8Array from 'helpers/keyToUint8Array';

describe('keyToUint8Array', () => {
  it('converts an array-like object of byte values into a Uint8Array', () => {
    expect(Array.from(keyToUint8Array([1, 2, 3]))).toEqual([1, 2, 3]);
  });
});
