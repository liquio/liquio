import { describe, expect, it } from 'vitest';
import getFileUrl from 'helpers/getFileUrl';

describe('getFileUrl', () => {
  it('builds a data URL for html format', async () => {
    expect(await getFileUrl(undefined, 'html', '<p>hi</p>')).toContain('data:text/html');
  });

  it('creates an object URL for a file', async () => {
    const file = new File(['content'], 'a.txt');
    expect(await getFileUrl(file, undefined, '')).toMatch(/^blob:/);
  });

  it('returns an empty string when there is no file', async () => {
    expect(await getFileUrl(null, undefined, '')).toBe('');
  });
});
