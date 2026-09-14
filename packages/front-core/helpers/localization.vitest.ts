import { describe, expect, it, vi } from 'vitest';
import {
  getTranslationCandidates,
  isLocalizationKey,
  isMissingTranslationValue,
  normalizeCode,
  pickLocalizedTexts,
  resolveLocalizationText
} from 'helpers/localization';

// helpers/localization only needs getQueryLangParam from actions/auth; stub the whole module
// so importing it doesn't also boot the real Redux store and runtime config.
vi.mock('actions/auth', () => ({ getQueryLangParam: () => null }));

describe('normalizeCode', () => {
  it('normalizes common language code variants', () => {
    expect(normalizeCode('uk-UA')).toBe('uk');
    expect(normalizeCode('en-GB')).toBe('eng');
  });

  it('passes through unrecognized codes and returns null for empty input', () => {
    expect(normalizeCode('xx-XX')).toBe('xx-XX');
    expect(normalizeCode(null)).toBeNull();
  });
});

describe('getTranslationCandidates', () => {
  it('includes normalized fallbacks for Ukrainian', () => {
    expect(getTranslationCandidates('uk-UA')).toEqual(expect.arrayContaining(['uk-UA', 'uk', 'ua']));
  });
});

describe('pickLocalizedTexts', () => {
  it('picks the best-ranked translation per key', () => {
    const texts = [
      { key: 'K', value: 'fallback', localizationLanguageCode: 'en' },
      { key: 'K', value: 'preferred', localizationLanguageCode: 'uk' }
    ];
    expect(pickLocalizedTexts(texts, getTranslationCandidates('uk'))).toEqual([{ key: 'K', value: 'preferred' }]);
  });
});

describe('isLocalizationKey / isMissingTranslationValue', () => {
  it('recognizes SCREAMING_SNAKE_CASE keys', () => {
    expect(isLocalizationKey('SOME_KEY')).toBe(true);
    expect(isLocalizationKey('not a key')).toBe(false);
  });

  it('treats an empty or unresolved translation as missing', () => {
    expect(isMissingTranslationValue('', 'KEY')).toBe(true);
    expect(isMissingTranslationValue('KEY', 'KEY')).toBe(true);
    expect(isMissingTranslationValue('Translated', 'KEY')).toBe(false);
  });
});

describe('resolveLocalizationText', () => {
  it('replaces localization keys embedded in a string', () => {
    const result = resolveLocalizationText('Status: SOME_KEY', {
      localizationTexts: [{ key: 'SOME_KEY', value: 'Active', localizationLanguageCode: 'uk' }],
      defaultLanguage: 'uk'
    });
    expect(result).toBe('Status: Active');
  });

  it('passes non-string values through unchanged', () => {
    expect(resolveLocalizationText(42)).toBe(42);
  });
});
