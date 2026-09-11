import { describe, expect, it } from 'vitest';
import isCyrillic, { cyrillicLetters } from 'helpers/isCyrillic';

describe('isCyrillic', () => {
  it('accepts cyrillic text with common punctuation and digits', () => {
    expect(isCyrillic('Привіт, світ 123')).toBe(true);
  });

  it('rejects latin text', () => {
    expect(isCyrillic('Hello world')).toBe(false);
  });
});

describe('cyrillicLetters', () => {
  it('accepts only bare cyrillic letters', () => {
    expect(cyrillicLetters('Привіт')).toBe(true);
  });

  it('rejects text containing punctuation or digits', () => {
    expect(cyrillicLetters('Привіт1')).toBe(false);
  });
});
