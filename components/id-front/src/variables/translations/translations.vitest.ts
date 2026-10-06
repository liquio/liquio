import { describe, expect, it } from 'vitest';

import en from './en-GB';
import fr from './fr-FR';
import ua from './ua-UK';

const flatten = (value: unknown, prefix = ''): string[] => {
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null ? flatten(child, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
};

const keysOf = (locale: unknown): Set<string> => new Set(flatten(locale));
const enKeys = keysOf(en);
const missingFrom = (locale: unknown): string[] => [...enKeys].filter((key) => !keysOf(locale).has(key));
const extraIn = (locale: unknown): string[] => [...keysOf(locale)].filter((key) => !enKeys.has(key));

// Key drift between the locales predates the TypeScript migration. It is pinned here, not fixed:
// no translation string was added or removed.
describe('translation locales', () => {
  it('differ in their top-level sections: en alone has FAQ; fr and ua alone have Layout, TwoFactorAuthPage and FooterBusiness', () => {
    const enSections = Object.keys(en);
    for (const locale of [fr, ua]) {
      const sections = Object.keys(locale);
      expect(enSections.filter((name) => !sections.includes(name))).toEqual(['FAQ']);
      expect(sections.filter((name) => !enSections.includes(name))).toEqual(['Layout', 'TwoFactorAuthPage', 'FooterBusiness']);
    }
  });

  it('only contain string messages', () => {
    for (const locale of [en, fr, ua]) {
      expect(flatten(locale).length).toBeGreaterThan(0);
    }
    expect(typeof en.locale).toBe('string');
  });

  // Preserved: the French and Ukrainian files declare `locale: 'en'`.
  it('declare locale "en" in every file', () => {
    expect(en.locale).toBe('en');
    expect(fr.locale).toBe('en');
    expect(ua.locale).toBe('en');
  });

  it('en has 293 keys, fr 342 and ua 339', () => {
    expect(enKeys.size).toBe(293);
    expect(keysOf(fr).size).toBe(342);
    expect(keysOf(ua).size).toBe(339);
  });

  const missingInBoth = [
    'LoginPage.AlreadyHaveAcc',
    'FAQ.TEXT2',
    'FAQ.TEXT4',
    'FAQ.TEXT5',
    'FAQ.TEXT7',
    'FAQ.TEXT8',
    'FAQ.TEXT10',
    'FAQ.TEXT11',
    'FAQ.TEXT13',
    'FAQ.TEXT14',
  ];

  it('fr lacks the same 10 keys that en has', () => {
    expect(missingFrom(fr)).toEqual(missingInBoth);
  });

  it('ua lacks the same 10 keys that en has', () => {
    expect(missingFrom(ua)).toEqual(missingInBoth);
  });

  it('fr has 59 keys that en lacks, ua has 56', () => {
    expect(extraIn(fr)).toHaveLength(59);
    expect(extraIn(ua)).toHaveLength(56);
  });

  it('the extra ua keys are all also extra in fr; fr adds three Mauritania login keys', () => {
    const uaExtra = new Set(extraIn(ua));
    expect(extraIn(fr).filter((key) => !uaExtra.has(key))).toEqual([
      'LoginPage.LoginAndPassMauritanie',
      'LoginPage.LoginAndPassMauritanieText',
      'LoginPage.MdkEId',
    ]);
    expect([...uaExtra].every((key) => extraIn(fr).includes(key))).toBe(true);
  });

  it('the extras come from eight sections', () => {
    const sections = new Set(extraIn(fr).map((key) => key.split('.')[0]));
    expect([...sections].sort()).toEqual(
      [
        'DatePicker',
        'Footer',
        'FooterBusiness',
        'Layout',
        'LoginPage',
        'Navigator',
        'SignForm',
        'TwoFactorAuthPage',
      ].sort()
    );
  });

  // Preserved: en spells it `AlreadyHaveAcc`, fr and ua `alreadyHaveAcc`.
  it('spells the already-have-account key differently in en and fr/ua', () => {
    expect(enKeys.has('LoginPage.AlreadyHaveAcc')).toBe(true);
    expect(keysOf(fr).has('LoginPage.AlreadyHaveAcc')).toBe(false);
    expect(keysOf(fr).has('LoginPage.alreadyHaveAcc')).toBe(true);
    expect(keysOf(ua).has('LoginPage.alreadyHaveAcc')).toBe(true);
  });
});
