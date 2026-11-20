import { describe, expect, it } from 'vitest';
import isEmpty from 'helpers/isEmpty';

describe('isEmpty', () => {
  it.each([
    [[], true],
    [{}, true],
    [null, true],
    [undefined, true],
    ['', true],
    [0, false],
    [true, false],
    [false, false],
    [new Date(), false],
    [() => {}, false],
    [[1], false],
    [{ a: 1 }, false],
    ['text', false]
  ])('isEmpty(%p) === %p', (value, expected) => {
    expect(isEmpty(value)).toBe(expected);
  });
});
