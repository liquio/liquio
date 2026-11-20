import { errorRef, pickLogFields, sanitizeLogContext } from './log_context';

describe('pickLogFields', () => {
  it('keeps scalar values of listed fields only', () => {
    const payload = { a: 'x', b: 1, c: true, d: { n: 1 }, e: [1], f: 'y'.repeat(129), g: '', h: null, i: NaN, z: 'no' };
    expect(pickLogFields(payload, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'missing'])).toEqual({ a: 'x', b: 1, c: true });
    expect(pickLogFields({ f: 'y'.repeat(128) }, ['f'])).toEqual({ f: 'y'.repeat(128) });
  });

  it('never throws', () => {
    expect(pickLogFields(null, ['a'])).toEqual({});
    expect(pickLogFields([1], ['a'])).toEqual({});
    const hostile = {
      get a(): string {
        throw new Error('boom');
      },
    };
    expect(pickLogFields(hostile, ['a'])).toEqual({});
  });
});

describe('sanitizeLogContext', () => {
  it('applies the scalar rule, drops body-like keys and limits keys', () => {
    expect(sanitizeLogContext({ a: 1, body: 'x', payload: 'x', message: 'x', messageString: 'x', n: { x: 1 } })).toEqual({ a: 1 });
    const many: Record<string, number> = {};
    for (let i = 0; i < 30; i++) many['k' + i] = i;
    expect(Object.keys(sanitizeLogContext(many))).toHaveLength(20);
    expect(sanitizeLogContext('str')).toEqual({});
    expect(sanitizeLogContext(null)).toEqual({});
  });
});

describe('errorRef', () => {
  it('returns name and code only', () => {
    const error = Object.assign(new TypeError('secret'), { code: 'E_BAD', stack: 'stack' });
    expect(errorRef(error)).toEqual({ name: 'TypeError', code: 'E_BAD' });
    expect(errorRef(Object.assign(new Error('x'), { code: 12 }))).toEqual({ name: 'Error', code: 12 });
  });

  it('drops invalid codes', () => {
    expect(errorRef(Object.assign(new Error('x'), { code: { a: 1 } }))).toEqual({ name: 'Error' });
    expect(errorRef(Object.assign(new Error('x'), { code: 'a'.repeat(65) }))).toEqual({ name: 'Error' });
    expect(errorRef(Object.assign(new Error('x'), { code: 'bad code!' }))).toEqual({ name: 'Error' });
    expect(errorRef(Object.assign(new Error('x'), { code: Infinity }))).toEqual({ name: 'Error' });
  });

  it('handles non-errors', () => {
    expect(errorRef('x')).toEqual({ name: 'NonError' });
    expect(errorRef({ message: 'x' })).toEqual({ name: 'NonError' });
    expect(errorRef(undefined)).toEqual({ name: 'NonError' });
  });
});
