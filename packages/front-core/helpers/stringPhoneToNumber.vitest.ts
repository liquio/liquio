import { describe, expect, it } from 'vitest';
import stringPhoneToNumber from 'helpers/stringPhoneToNumber';

describe('stringPhoneToNumber', () => {
  it('strips formatting characters from a phone string', () => {
    expect(stringPhoneToNumber('+38 (050) 123-45-67')).toBe('380501234567');
  });

  it('returns undefined for empty input', () => {
    expect(stringPhoneToNumber('')).toBeUndefined();
    expect(stringPhoneToNumber(null)).toBeUndefined();
  });
});
