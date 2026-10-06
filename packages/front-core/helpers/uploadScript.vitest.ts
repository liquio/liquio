import { describe, expect, it } from 'vitest';
import uploadScript from 'helpers/uploadScript';

describe('uploadScript', () => {
  it('appends a script tag pointing to the given link', () => {
    uploadScript('https://example.com/script.js');
    const script = document.head.querySelector('script[src="https://example.com/script.js"]');
    expect(script).not.toBeNull();
  });
});
