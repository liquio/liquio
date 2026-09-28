import { describe, expect, it } from 'vitest';
import stringToArray from 'helpers/stringToArray';

describe('stringToArray', () => {
  it('encodes a string as UTF-8 bytes', () => {
    expect(Array.from(stringToArray('AB'))).toEqual([65, 66]);
  });
});
