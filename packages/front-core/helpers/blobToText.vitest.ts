import { describe, expect, it } from 'vitest';
import blobToText from 'helpers/blobToText';

describe('blobToText', () => {
  it('reads a blob as text', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    expect(await blobToText(blob)).toBe('hello');
  });
});
