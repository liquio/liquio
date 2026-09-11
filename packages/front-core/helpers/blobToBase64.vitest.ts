import { describe, expect, it } from 'vitest';
import blobToBase64 from 'helpers/blobToBase64';

describe('blobToBase64', () => {
  it('encodes a blob as a data URL', async () => {
    const result = await blobToBase64(new Blob(['hi'], { type: 'text/plain' }));
    expect(result).toMatch(/^data:text\/plain;base64,/);
  });

  it('passes non-Blob values through unchanged', async () => {
    expect(await blobToBase64('already-encoded')).toBe('already-encoded');
  });
});
