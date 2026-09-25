import { describe, expect, it } from 'vitest';
import toUnderscore, { toUnderscoreObject } from 'helpers/toUnderscore';

describe('toUnderscore', () => {
  it('converts camelCase to snake_case', () => {
    expect(toUnderscore('backendUrl')).toBe('backend_url');
  });
});

describe('toUnderscoreObject', () => {
  it('converts keys recursively by default', () => {
    expect(toUnderscoreObject({ backendUrl: '/api', nested: { authLink: '/auth' } })).toEqual({
      backend_url: '/api',
      nested: { auth_link: '/auth' }
    });
  });

  it('leaves nested objects untouched when deep is false', () => {
    expect(toUnderscoreObject({ nestedValue: { authLink: '/auth' } }, false)).toEqual({
      nested_value: { authLink: '/auth' }
    });
  });
});
