import { describe, expect, it } from 'vitest';
import checkSignersData from 'helpers/checkSignersData';

describe('checkSignersData', () => {
  it('is false for an empty or missing list', () => {
    expect(checkSignersData(undefined)).toBe(false);
    expect(checkSignersData([])).toBe(false);
  });

  it('is true when every signer has a valid id and email', () => {
    expect(checkSignersData([{ ipn: '1234567890', email: 'a@b.com' }])).toBe(true);
  });

  it('is false if any signer has an invalid id or email', () => {
    expect(checkSignersData([{ ipn: '1234567890', email: 'a@b.com' }, { ipn: 'bad', email: 'a@b.com' }])).toBe(false);
    expect(checkSignersData([{ ipn: '1234567890', email: 'not-an-email' }])).toBe(false);
  });
});
