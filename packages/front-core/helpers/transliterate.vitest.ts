import { describe, expect, it } from 'vitest';
import transliterate from 'helpers/transliterate';

describe('transliterate', () => {
  it('converts mapped Cyrillic letters to Latin, leaving unmapped characters as-is', () => {
    // 'і' has no entry in the transliteration map and passes through unchanged.
    expect(transliterate('Привіт')).toBe('Privіt');
  });

  it('keeps the soft sign apostrophe when no config is given', () => {
    expect(transliterate('Русь')).toBe("Rus'");
  });

  it('strips the soft sign by default and lowercases when configured', () => {
    expect(transliterate('Русь', { lowerCase: true })).toBe('rus');
  });

  it('keeps the soft sign when softSign is set', () => {
    expect(transliterate('Русь', { softSign: true, lowerCase: true })).toBe("rus'");
  });
});
