import { afterEach, describe, expect, it } from 'vitest';
import { getSplitPosition, setSplitPosition } from 'helpers/splitPosition';

afterEach(() => localStorage.clear());

describe('splitPosition', () => {
  it('persists and reads back a split size', () => {
    setSplitPosition('panel')('320');
    expect(getSplitPosition('panel')).toBe(320);
  });

  it('falls back to the default or 50% when unset', () => {
    expect(getSplitPosition('missing', '40%')).toBe('40%');
    expect(getSplitPosition('missing')).toBe('50%');
  });
});
