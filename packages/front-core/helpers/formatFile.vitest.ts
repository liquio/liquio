import { describe, expect, it } from 'vitest';
import formatFile from 'helpers/formatFile';

describe('formatFile', () => {
  it('retypes an octet-stream file as PDF when the text hints at PDF content', async () => {
    const file = new File(['data'], 'a', { type: 'application/octet-stream' });
    const result = await formatFile(file, 'this is a PDF');
    expect(result.type).toBe('application/pdf');
  });

  it('leaves other files unchanged', async () => {
    const file = new File(['data'], 'a', { type: 'text/plain' });
    expect(await formatFile(file, '')).toBe(file);
  });
});
