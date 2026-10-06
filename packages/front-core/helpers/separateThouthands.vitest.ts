import { describe, expect, it } from 'vitest';
import separateThouthands from 'helpers/separateThouthands';

describe('separateThouthands', () => {
  it('inserts the separator every three digits', () => {
    expect(separateThouthands(1234567, ',')).toBe('1,234,567');
  });
});
