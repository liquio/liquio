import { describe, expect, it } from 'vitest';
import toCamelCase from 'helpers/toCamelCase';

describe('toCamelCase', () => {
  it('joins underscore-separated words, capitalizing each', () => {
    expect(toCamelCase('backend_url')).toBe('BackendUrl');
  });

  it('passes through a single word capitalized', () => {
    expect(toCamelCase('name')).toBe('Name');
  });
});
