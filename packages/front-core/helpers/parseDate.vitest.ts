import { describe, expect, it } from 'vitest';
import parseDate from 'helpers/parseDate';

describe('parseDate', () => {
  it('splits a date into day/month/year', () => {
    expect(parseDate('2024-03-05', 'YYYY-MM-DD')).toEqual({ day: '05', month: '03', year: '2024' });
  });

  it('returns null for empty or invalid input', () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate('Invalid date')).toBeNull();
  });
});
