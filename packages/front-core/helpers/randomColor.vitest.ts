import { describe, expect, it } from 'vitest';
import randomColor from 'helpers/randomColor';

describe('randomColor', () => {
  it('returns an rgb() color string', () => {
    expect(randomColor()).toMatch(/^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/);
  });
});
