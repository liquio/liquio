import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DateHelpers = typeof import('./humanDateFormat');

const loadWithConfig = async (config: Record<string, unknown>): Promise<DateHelpers> => {
  vi.resetModules();
  const { loadConfig } = await import('./configLoader');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no config.json')));
  await loadConfig(config);
  return import('./humanDateFormat');
};

describe('humanDateFormat', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('throws when the configuration is not loaded', async () => {
    vi.resetModules();
    const { default: humanDateFormat } = await import('./humanDateFormat');
    expect(() => humanDateFormat('2024-03-05')).toThrow('Configuration not loaded');
  });

  it('formats with the default DD.MM.YYYY when the config has no variables', async () => {
    const { default: humanDateFormat } = await loadWithConfig({});
    expect(humanDateFormat('2024-03-05T10:20:30')).toBe('05.03.2024');
  });

  it('uses the format argument when the config has no dateFormat', async () => {
    const { default: humanDateFormat } = await loadWithConfig({});
    expect(humanDateFormat('2024-03-05T10:20:30', 'YYYY/MM/DD')).toBe('2024/03/05');
  });

  it('prefers variables.dateFormat over the format argument', async () => {
    const { default: humanDateFormat } = await loadWithConfig({ variables: { dateFormat: 'MM-DD-YYYY' } });
    expect(humanDateFormat('2024-03-05T10:20:30', 'YYYY/MM/DD')).toBe('03-05-2024');
  });

  it('formats date and time with the default DD.MM.YYYY HH:mm', async () => {
    const { humanDateTimeFormat } = await loadWithConfig({});
    expect(humanDateTimeFormat('2024-03-05T10:20:30')).toBe('05.03.2024 10:20');
  });

  it('prefers variables.dateTimeFormat for date and time', async () => {
    const { humanDateTimeFormat } = await loadWithConfig({ variables: { dateTimeFormat: 'HH:mm DD/MM' } });
    expect(humanDateTimeFormat('2024-03-05T10:20:30', 'YYYY')).toBe('10:20 05/03');
  });

  it('dateToMoment returns anything that is not d/m/y unchanged', async () => {
    const { dateToMoment } = await loadWithConfig({});
    expect(dateToMoment('1990-01-02')).toBe('1990-01-02');
    expect(dateToMoment('1/2')).toBe('1/2');
  });

  it('dateToMoment turns d/m/y into a moment with that day, month and year', async () => {
    const { dateToMoment } = await loadWithConfig({});
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));

    const result = dateToMoment('7/3/1990');

    expect(typeof result).toBe('object');
    expect(typeof result === 'string' ? '' : result.format('YYYY-MM-DD')).toBe('1990-03-07');
  });

  it('dateToMoment keeps the current time of day (preserved: only date, month and year are set)', async () => {
    const { dateToMoment } = await loadWithConfig({});
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 34, 56));

    const result = dateToMoment('7/3/1990');

    expect(typeof result === 'string' ? '' : result.format('HH:mm:ss')).toBe('12:34:56');
  });

  it('today returns the current moment', async () => {
    const { today } = await loadWithConfig({});
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));

    expect(today().format('YYYY-MM-DD')).toBe('2024-06-15');
  });

  it('fourteenYearsAgo returns a moment without a format and a string with one', async () => {
    const { fourteenYearsAgo } = await loadWithConfig({});
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));

    const asMoment = fourteenYearsAgo();
    expect(typeof asMoment).toBe('object');
    expect(typeof asMoment === 'string' ? '' : asMoment.format('YYYY-MM-DD')).toBe('2010-06-15');
    expect(fourteenYearsAgo('DD.MM.YYYY')).toBe('15.06.2010');
  });

  it('exposes the filter constants', async () => {
    const { filterFormat, filterMinDate, filterMaxDate } = await loadWithConfig({});
    expect(filterFormat).toBe('YYYY-MM-DD');
    expect(filterMinDate).toBe('1900-01-01');
    expect(filterMaxDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number(filterMaxDate.slice(0, 4))).toBe(new Date().getFullYear() + 10);
  });
});
