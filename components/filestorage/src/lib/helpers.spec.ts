import { Helpers } from './helpers';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('Helpers.parseIds', () => {
  it('trims, drops empties and dedupes', () => {
    expect(Helpers.parseIds(` ${A},${A},,${B.toUpperCase()} ,`, 10)).toEqual([A, B]);
  });

  it('accepts arrays', () => {
    expect(Helpers.parseIds([A, A, B], 10)).toEqual([A, B]);
  });

  it('rejects non-array/non-string input with 400', () => {
    expect(() => Helpers.parseIds(undefined, 10)).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => Helpers.parseIds({ length: 1 }, 10)).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => Helpers.parseIds([1], 10)).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('rejects malformed IDs with 400', () => {
    expect(() => Helpers.parseIds(`${A},nope`, 10)).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('rejects more unique IDs than max, but not repeated ones', () => {
    expect(() => Helpers.parseIds([A, B], 1)).toThrow(expect.objectContaining({ status: 400 }));
    expect(Helpers.parseIds([A, A, A], 1)).toEqual([A]);
  });
});
