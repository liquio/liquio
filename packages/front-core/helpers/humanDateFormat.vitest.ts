import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('./configLoader');
  vi.resetModules();
});

describe('humanDateFormat', () => {
  it('formats using the configured date format', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({ variables: { dateFormat: 'YYYY/MM/DD' } }) }));
    const { default: humanDateFormat } = await import('helpers/humanDateFormat');
    expect(humanDateFormat('2024-03-05')).toBe('2024/03/05');
  });

  it('falls back to the default format when unconfigured', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({}) }));
    const { default: humanDateFormat } = await import('helpers/humanDateFormat');
    expect(humanDateFormat('2024-03-05')).toBe('05.03.2024');
  });
});

describe('dateToMoment', () => {
  it('parses a slash-separated date into a moment', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({}) }));
    const { dateToMoment } = await import('helpers/humanDateFormat');
    const result = dateToMoment('5/3/2024');
    expect(typeof result).not.toBe('string');
  });

  it('passes non-slash-separated input through unchanged', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({}) }));
    const { dateToMoment } = await import('helpers/humanDateFormat');
    expect(dateToMoment('not-a-date')).toBe('not-a-date');
  });
});
