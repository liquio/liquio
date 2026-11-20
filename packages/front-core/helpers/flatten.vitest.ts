import { describe, expect, it } from 'vitest';
import flatten from 'helpers/flatten';

describe('flatten', () => {
  it('flattens nested arrays of any depth', () => {
    expect(flatten([1, [2, 3, [4, [5]]], 6])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('returns a shallow array unchanged', () => {
    expect(flatten([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('returns an empty array for an empty input', () => {
    expect(flatten([])).toEqual([]);
  });
});
