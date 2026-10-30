import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import en from './en-GB';
import fr from './fr-FR';
import ua from './ua-UK';

type Module = typeof import('./index');

interface Setup {
  cookie?: string;
  configLang?: string | 'throw';
  search?: string;
}

const mocks = {
  getCookie: vi.fn<(name: string) => string | undefined>(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  getConfig: vi.fn(),
};

// `chosenLanguage` is computed when the module is first imported, so every test loads a fresh copy.
const load = async ({ cookie, configLang, search = '' }: Setup = {}): Promise<Module> => {
  vi.resetModules();
  mocks.getCookie.mockReturnValue(cookie);
  mocks.getConfig.mockImplementation(() => {
    if (configLang === 'throw') throw new Error('Configuration not loaded');
    return configLang === undefined ? {} : { defaultLanguage: configLang };
  });
  vi.doMock('helpers/getCookie', () => ({ default: mocks.getCookie }));
  vi.doMock('helpers/setCookie', () => ({ default: mocks.setCookie }));
  vi.doMock('helpers/deleteCookie', () => ({ default: mocks.deleteCookie }));
  vi.doMock('helpers/configLoader', () => ({ getConfig: mocks.getConfig }));
  window.history.replaceState(null, '', `/${search}`);
  return import('./index');
};

describe('translations/index', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  afterEach(() => {
    vi.doUnmock('helpers/getCookie');
    vi.doUnmock('helpers/setCookie');
    vi.doUnmock('helpers/deleteCookie');
    vi.doUnmock('helpers/configLoader');
    window.history.replaceState(null, '', '/');
  });

  describe('getQueryLangParam', () => {
    it('prefers the lang cookie', async () => {
      const { getQueryLangParam } = await load({ cookie: 'fr', configLang: 'en', search: '?lang=ua' });
      expect(getQueryLangParam()).toBe('fr');
      expect(mocks.setCookie).not.toHaveBeenCalled();
    });

    it('falls back to config.defaultLanguage when there is no cookie', async () => {
      const { getQueryLangParam } = await load({ configLang: 'en', search: '?lang=ua' });
      expect(getQueryLangParam()).toBe('en');
      expect(mocks.setCookie).not.toHaveBeenCalled();
    });

    it('uses the ?lang query parameter and stores it in a one-day cookie', async () => {
      const { getQueryLangParam } = await load({ search: '?foo=1&lang=ua' });
      expect(getQueryLangParam()).toBe('ua');
      expect(mocks.setCookie).toHaveBeenCalledWith('lang', 'ua', 1);
    });

    it('survives getConfig() throwing because the config is not loaded', async () => {
      const { getQueryLangParam } = await load({ configLang: 'throw', search: '?lang=fr' });
      expect(getQueryLangParam()).toBe('fr');
    });

    it('returns null without cookie, config language or query string', async () => {
      const { getQueryLangParam } = await load({ configLang: 'throw' });
      expect(getQueryLangParam()).toBeNull();
    });

    it('returns null when the query string has no lang', async () => {
      const { getQueryLangParam } = await load({ search: '?foo=1' });
      expect(getQueryLangParam()).toBeNull();
      expect(mocks.setCookie).not.toHaveBeenCalled();
    });

    // Preserved: the value is not validated, so an unknown language is stored and returned.
    it('does not validate the query value', async () => {
      const { getQueryLangParam } = await load({ search: '?lang=xx' });
      expect(getQueryLangParam()).toBe('xx');
      expect(mocks.setCookie).toHaveBeenCalledWith('lang', 'xx', 1);
    });

    // Preserved: deleteCookie('lang') after `if (langExists)` is unreachable.
    it('never deletes the cookie', async () => {
      const { getQueryLangParam } = await load({ search: '?lang=fr' });
      getQueryLangParam();
      expect(mocks.deleteCookie).not.toHaveBeenCalled();
    });

    // Preserved: an empty query value is falsy for the cookie check but still "exists".
    it('stores an empty ?lang= value', async () => {
      const { getQueryLangParam } = await load({ search: '?lang=' });
      expect(getQueryLangParam()).toBe('');
      expect(mocks.setCookie).toHaveBeenCalledWith('lang', '', 1);
    });
  });

  describe('default export', () => {
    it('returns the English translations for language en', async () => {
      const { default: getTranslations } = await load({ cookie: 'en' });
      expect(getTranslations('liquio')).toEqual(en);
    });

    it('returns the English translations for language eng', async () => {
      const { default: getTranslations } = await load({ cookie: 'eng' });
      expect(getTranslations()).toEqual(en);
    });

    it('returns the French translations for language fr', async () => {
      const { default: getTranslations } = await load({ cookie: 'fr' });
      expect(getTranslations('anything')).toEqual(fr);
    });

    it('returns the Ukrainian translations for language bpmn', async () => {
      const { default: getTranslations } = await load({ cookie: 'bpmn' });
      expect(getTranslations()).toEqual(ua);
    });

    // Preserved: "ua" is not a key of the translations map, so it takes the app-name path.
    it('falls back to the Ukrainian (bpmn) translations for language ua', async () => {
      const { default: getTranslations } = await load({ cookie: 'ua' });
      expect(getTranslations('liquio')).toEqual(ua);
    });

    it('falls back to the Ukrainian translations for an unknown language', async () => {
      const { default: getTranslations } = await load({ cookie: 'xx' });
      expect(getTranslations('unknown-app')).toEqual(ua);
    });

    it('falls back to the Ukrainian translations when no language is chosen', async () => {
      const { default: getTranslations } = await load({ configLang: 'throw' });
      expect(getTranslations()).toEqual(ua);
    });

    it('merges by lower-cased app name; "BPMN" resolves to the Ukrainian translations', async () => {
      const { default: getTranslations } = await load({ configLang: 'throw' });
      expect(getTranslations('BPMN')).toEqual(ua);
    });

    it('does not mutate the locale objects when merging', async () => {
      const before = JSON.stringify(ua);
      const { default: getTranslations } = await load({ configLang: 'throw' });
      getTranslations('bpmn');
      expect(JSON.stringify(ua)).toBe(before);
    });

    it('lets the query string choose the language end to end', async () => {
      const { default: getTranslations } = await load({ search: '?lang=fr' });
      expect(getTranslations('liquio')).toEqual(fr);
    });
  });
});
