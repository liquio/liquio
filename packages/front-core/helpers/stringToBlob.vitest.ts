import { describe, expect, it } from 'vitest';
import stringToBlob from 'helpers/stringToBlob';

describe('stringToBlob', () => {
  it('defaults to a plain text blob', () => {
    expect(stringToBlob('hello').type).toBe('plain/text');
  });

  it('recognizes html content', () => {
    expect(stringToBlob('<html>text/html</html>').type).toBe('text/html');
  });
});
