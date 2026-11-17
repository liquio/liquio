import propByPath from 'prop-by-path';

import { freezeObjectPrototype } from './freeze_object_prototype';

describe('freeze_object_prototype', () => {
  beforeAll(() => {
    freezeObjectPrototype();
  });

  it('freezes Object.prototype', () => {
    expect(Object.isFrozen(Object.prototype)).toBe(true);
  });

  it('rejects writes to Object.prototype in strict mode', () => {
    expect(() => {
      (Object.prototype as any).polluted = 1;
    }).toThrow(TypeError);
    expect(({} as any).polluted).toBeUndefined();
  });

  it('does not let a raw prop-by-path __proto__ write reach Object.prototype', () => {
    try {
      (propByPath as any).set({}, '[__proto__][polluted]', 1);
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
    }
    expect(({} as any).polluted).toBeUndefined();
  });
});
