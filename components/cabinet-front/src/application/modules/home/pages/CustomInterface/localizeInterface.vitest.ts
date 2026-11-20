import { describe, expect, it, vi } from 'vitest';
import localizeInterface from './localizeInterface';

vi.mock('actions/auth', () => ({ getQueryLangParam: () => null }));

const localizationTexts = [
  { key: 'LANG_MY_CERTIFICATES', value: 'My certificates', localizationLanguageCode: 'en' },
  { key: 'LANG_MY_CERTIFICATES', value: 'Meine Zertifikate', localizationLanguageCode: 'de' },
  { key: 'LANG_VIEW', value: 'Ansehen', localizationLanguageCode: 'de' }
];

describe('custom interface localization', () => {
  it('translates the description and every nested occurrence using the selected language', () => {
    const schema = {
      description: 'LANG_MY_CERTIFICATES',
      properties: {
        LANG_VIEW: {
          description: 'LANG_VIEW',
          items: [{ htmlBlock: '<span>LANG_VIEW / LANG_VIEW</span>' }]
        }
      }
    };
    expect(localizeInterface(schema, { localizationTexts, defaultLanguage: 'de-DE' })).toEqual({
      description: 'Meine Zertifikate',
      properties: {
        LANG_VIEW: {
          description: 'Ansehen',
          items: [{ htmlBlock: '<span>Ansehen / Ansehen</span>' }]
        }
      }
    });
    expect(schema.description).toBe('LANG_MY_CERTIFICATES');
  });

  it('can re-localize the original schema after translations arrive or the language changes', () => {
    const schema = { description: 'LANG_MY_CERTIFICATES' };
    expect(localizeInterface(schema, { localizationTexts: [] })).toEqual(schema);
    expect(localizeInterface(schema, { localizationTexts, defaultLanguage: 'de' }).description)
      .toBe('Meine Zertifikate');
    expect(localizeInterface(schema, { localizationTexts, defaultLanguage: 'en' }).description)
      .toBe('My certificates');
  });

  it('preserves missing keys, literals, non-string values, and JSON-sensitive translations', () => {
    const schema = { description: 'LANG_VIEW', missing: 'LANG_UNKNOWN', literal: 'Certificate', count: 1, hidden: false, value: null };
    const result = localizeInterface(schema, {
      localizationTexts: [{ key: 'LANG_VIEW', value: '"Ansehen"\nDetails', localizationLanguageCode: 'de' }],
      defaultLanguage: 'de'
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual({ ...schema, description: '"Ansehen"\nDetails' });
  });
});
