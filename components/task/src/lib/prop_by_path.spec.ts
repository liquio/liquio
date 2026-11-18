import PropByPathLib from 'prop-by-path';

import { InvalidParamsError } from './errors';
import PropByPath from './prop_by_path';

describe('PropByPath wrapper', () => {
  afterEach(() => {
    delete (Object.prototype as any).polluted;
  });

  const unsafePaths = [
    '[__proto__][polluted]',
    '__proto__.polluted',
    'a.__proto__.polluted',
    'constructor.prototype.polluted',
    '[constructor][prototype][polluted]',
    'prototype.polluted',
  ];

  it.each(unsafePaths)('refuses %s', (path) => {
    expect(() => PropByPath.set({}, path, 1)).toThrow(InvalidParamsError);
    expect(() => PropByPath.set({}, path, 1)).toThrow('Invalid property path.');
    expect(() => PropByPath.delete({}, path)).toThrow('Invalid property path.');
    expect(PropByPath.get({}, path, 'd')).toBe('d');
    expect(({} as any).polluted).toBeUndefined();
  });

  it('matches the library for safe paths', () => {
    const a: any = {};
    const b: any = {};
    PropByPath.set(a, 'a.b', 1);
    PropByPath.set(b, 'a.b', 1);
    expect(a).toEqual(b);
    const c: any = {};
    PropByPath.set(c, 'a[0]', 1);
    expect(c).toEqual({ a: { 0: 1 } });
    expect(Array.isArray(c.a)).toBe(false);
    expect(PropByPath.get(a, 'a.b', 'd')).toBe(PropByPathLib.get(b, 'a.b', 'd'));
    expect(PropByPath.get(a, 'a.x', 'd')).toBe('d');
    PropByPath.delete(a, 'a.b');
    PropByPathLib.delete(b, 'a.b');
    expect(a).toEqual(b);
  });

  it('still throws TypeError for non-string path', () => {
    expect(() => PropByPath.set({}, 5 as any, 1)).toThrow(TypeError);
  });
});
