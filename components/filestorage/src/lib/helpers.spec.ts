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

describe('Helpers.safeEntryName', () => {
  it('keeps ordinary names', () => {
    expect(Helpers.safeEntryName('report 1.pdf')).toBe('report 1.pdf');
  });

  it('keeps only the last path segment for / and \\ separators', () => {
    expect(Helpers.safeEntryName('../../x.txt')).toBe('x.txt');
    expect(Helpers.safeEntryName('/etc/passwd')).toBe('passwd');
    expect(Helpers.safeEntryName('..\\..\\win\\x.txt')).toBe('x.txt');
    expect(Helpers.safeEntryName('a/b/')).toBe('b');
  });

  it('strips control characters', () => {
    expect(Helpers.safeEntryName('a\u0000b\n.txt')).toBe('ab.txt');
  });

  it('falls back to "file" for empty, dot-only and non-string names', () => {
    for (const bad of ['', '..', '.', '../..', '   ', '\u0000', undefined, null, 5]) {
      expect(Helpers.safeEntryName(bad)).toBe('file');
    }
  });
});
