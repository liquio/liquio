import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from 'services/api';
import { searchLocalization } from './multiLang';

vi.mock('services/api', () => ({ get: vi.fn() }));

const translations = (key: string) =>
  ['en', 'de', 'uk'].map((localizationLanguageCode) => ({
    key,
    localizationLanguageCode,
    value: `${key}:${localizationLanguageCode}`
  }));

describe('searchLocalization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('excludes similar keys from the values used to edit and save a translation', async () => {
    const selected = translations('LANG_TEST');
    vi.mocked(api.get).mockResolvedValue([
      ...selected,
      ...translations('LANG_TEST_NOT_PASSED'),
      ...translations('LANG_TEST_PASSED'),
      ...translations('lang_test')
    ]);

    expect(await searchLocalization('LANG_TEST')(vi.fn())).toEqual(selected);
  });

  it('collects exact matches across all result pages and encodes the key', async () => {
    const selected = translations('LANG_TEST&A');
    vi.mocked(api.get)
      .mockResolvedValueOnce(Object.assign(translations('LANG_TEST&A_OTHER'), { meta: { lastPage: 2 } }))
      .mockResolvedValueOnce(Object.assign(selected, { meta: { lastPage: 2 } }));
    const dispatch = vi.fn();

    expect(await searchLocalization('LANG_TEST&A')(dispatch)).toEqual([...selected]);
    expect(api.get).toHaveBeenNthCalledWith(
      2,
      'localization-texts?filters[key]=LANG_TEST%26A&page=2',
      'SEARCH_LOCALIZATION',
      dispatch
    );
  });

  it('rejects failed requests instead of returning incomplete translations', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(Object.assign(translations('LANG_TEST'), { meta: { lastPage: 2 } }))
      .mockRejectedValueOnce(new Error('Request failed'));

    await expect(searchLocalization('LANG_TEST')(vi.fn())).rejects.toThrow('Request failed');
  });
});
