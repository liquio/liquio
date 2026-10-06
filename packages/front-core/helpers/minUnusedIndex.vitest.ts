import { describe, expect, it } from 'vitest';
import minUnusedIndex from 'helpers/minUnusedIndex';

describe('minUnusedIndex', () => {
  it('finds the smallest missing index in a gap', () => {
    expect(minUnusedIndex([0, 1, 3])).toBe(2);
  });

  it('appends after the max when there is no gap', () => {
    expect(minUnusedIndex([0, 1, 2])).toBe(3);
  });

  it('starts searching from the given offset', () => {
    expect(minUnusedIndex([0, 2, 3], 1)).toBe(1);
  });
});
