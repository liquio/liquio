import { describe, expect, it } from 'vitest';
import filterUnexists from 'helpers/filterUnexists';

describe('filterUnexists', () => {
  it('is false for a null filter', () => {
    expect(filterUnexists('a', null)).toBe(false);
  });

  it('checks array membership for array filters', () => {
    expect(filterUnexists('a', ['a', 'b'])).toBe(false);
    expect(filterUnexists('c', ['a', 'b'])).toBe(true);
  });

  it('checks equality for scalar filters', () => {
    expect(filterUnexists('a', 'a')).toBe(false);
    expect(filterUnexists('a', 'b')).toBe(true);
  });
});
