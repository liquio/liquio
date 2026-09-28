import { describe, expect, it } from 'vitest';
import removeEmptyFields from 'helpers/removeEmptyFields';

describe('removeEmptyFields', () => {
  it('deletes null fields recursively', () => {
    expect(removeEmptyFields({ a: null, b: 1, c: { d: null, e: 2 } })).toEqual({ b: 1, c: { e: 2 } });
  });

  it('defaults to an empty object', () => {
    expect(removeEmptyFields()).toEqual({});
  });
});
