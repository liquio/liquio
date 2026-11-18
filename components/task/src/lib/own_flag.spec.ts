import { ownFlag, ownValue } from './own_flag';

describe('ownFlag / ownValue', () => {
  it('reads own flags', () => {
    expect(ownFlag({ a: true }, 'a')).toBe(true);
    expect(ownFlag({ a: 'yes' }, 'a')).toBe(true);
    expect(ownFlag({}, 'a')).toBe(false);
  });

  it('ignores inherited flags', () => {
    expect(ownFlag(Object.create({ a: true }), 'a')).toBe(false);
  });

  it('returns default for non-objects', () => {
    expect(ownFlag(null, 'a', true)).toBe(true);
  });

  it('ownValue returns own value or default', () => {
    expect(ownValue({}, 'p', [])).toEqual([]);
    expect(ownValue(Object.create({ p: 1 }), 'p', 0)).toBe(0);
    expect(ownValue({ p: 5 }, 'p', 0)).toBe(5);
  });
});
