import { isFunctionString } from './function_string';

describe('isFunctionString', () => {
  it.each(['() => 123', 'async () => 1', 'x => x', '(a, b) => a + b', 'function () { return 1 }', 'async function f() {}'])(
    'returns true for %s',
    (value) => {
      expect(isFunctionString(value)).toBe(true);
    },
  );

  it.each([123, 'abc', '123', 'process.exit()', undefined, null, {}, []])('returns false for %p', (value) => {
    expect(isFunctionString(value as any)).toBe(false);
  });

  it('does not execute the value', () => {
    const g = globalThis as any;
    g.__isFunctionStringExecuted = false;
    expect(isFunctionString('(() => { globalThis.__isFunctionStringExecuted = true; })()')).toBe(false);
    expect(isFunctionString('globalThis.__isFunctionStringExecuted = true')).toBe(false);
    expect(g.__isFunctionStringExecuted).toBe(false);
    delete g.__isFunctionStringExecuted;
  });
});
