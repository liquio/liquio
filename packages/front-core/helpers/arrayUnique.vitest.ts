import { describe, expect, it } from 'vitest';
import arrayUnique, { objectArrayUnique, uniqbyValue } from 'helpers/arrayUnique';

describe('arrayUnique (default)', () => {
  it('removes duplicate primitive values, keeping the first occurrence', () => {
    expect(arrayUnique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });
});

describe('objectArrayUnique', () => {
  it('dedupes by a given id property', () => {
    const rows = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 1, name: 'a-again' }
    ];
    expect(objectArrayUnique(rows, 'id')).toEqual([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' }
    ]);
  });

  it('dedupes by deep equality when no id property is given', () => {
    const rows = [{ a: 1 }, { a: 1 }, { a: 2 }];
    expect(objectArrayUnique(rows)).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

describe('uniqbyValue', () => {
  it('dedupes by the value field', () => {
    const items = [{ value: 1 }, { value: 2 }, { value: 1 }];
    expect(uniqbyValue(items)).toEqual([{ value: 1 }, { value: 2 }]);
  });

  it('returns an empty array for null or undefined input', () => {
    expect(uniqbyValue(null)).toEqual([]);
    expect(uniqbyValue(undefined)).toEqual([]);
  });
});
