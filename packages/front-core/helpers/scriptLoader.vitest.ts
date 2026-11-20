import { describe, expect, it } from 'vitest';
import loadScript, { cssLoader } from 'helpers/scriptLoader';

describe('cssLoader', () => {
  it('appends a stylesheet link once per URL', () => {
    cssLoader('https://example.com/a.css');
    cssLoader('https://example.com/a.css');
    expect(document.querySelectorAll('link[href="https://example.com/a.css"]')).toHaveLength(1);
  });
});

describe('scriptLoader (default)', () => {
  it('resolves immediately if the script is already present', async () => {
    const script = document.createElement('script');
    script.src = 'https://example.com/present.js';
    document.body.appendChild(script);
    await expect(loadScript('https://example.com/present.js')).resolves.toBeUndefined();
  });
});
