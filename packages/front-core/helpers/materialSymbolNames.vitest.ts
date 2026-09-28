import { describe, expect, it } from 'vitest';
import materialSymbolNames from 'helpers/materialSymbolNames';

describe('materialSymbolNames', () => {
  it('is a non-empty list of unique icon name strings', () => {
    expect(materialSymbolNames.length).toBeGreaterThan(1000);
    expect(new Set(materialSymbolNames).size).toBe(materialSymbolNames.length);
    expect(materialSymbolNames).toContain('zoom_in');
  });
});
