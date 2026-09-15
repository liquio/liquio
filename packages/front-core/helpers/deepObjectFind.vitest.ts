import { describe, expect, it } from 'vitest';
import deepObjectFind, { deepFind, deepObjectFindAll } from 'helpers/deepObjectFind';

const tree = { a: { b: { target: true, name: 'inner' } }, c: { target: true, name: 'outer' } };

describe('deepObjectFind', () => {
  it('returns the first matching object found', () => {
    expect(deepObjectFind(tree, (v: unknown) => !!(v as { target?: boolean })?.target)).toBeTruthy();
  });

  it('returns null for non-object input', () => {
    expect(deepObjectFind('text', () => true)).toBeNull();
  });
});

describe('deepObjectFindAll', () => {
  it('collects every matching object', () => {
    expect(deepObjectFindAll(tree, (v: unknown) => !!(v as { target?: boolean })?.target)).toHaveLength(2);
  });
});

describe('deepFind', () => {
  it('finds a value by key anywhere in the object', () => {
    expect(deepFind({ a: { b: { c: 5 } } }, 'c')).toBe(5);
  });

  it('returns undefined when the key is absent', () => {
    expect(deepFind({ a: 1 }, 'missing')).toBeUndefined();
  });
});
