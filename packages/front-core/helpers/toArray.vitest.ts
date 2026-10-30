import { describe, expect, it } from 'vitest';
import toArray from 'helpers/toArray';

describe('toArray', () => {
  it('returns arrays unchanged', () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('parses a JSON-encoded array string', () => {
    expect(toArray('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns an empty array for unparsable input', () => {
    expect(toArray('not json')).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
  });
});
