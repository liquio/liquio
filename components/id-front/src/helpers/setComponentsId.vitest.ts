import { describe, expect, it } from 'vitest';

import setComponentsId from 'helpers/setComponentsId';

describe('setComponentsId', () => {
  it('builds ids as id-<page>-<element>', () => {
    const setId = setComponentsId('login');
    expect(setId('submit')).toBe('id-login-submit');
    expect(setId('email')).toBe('id-login-email');
  });

  it('keeps pages independent', () => {
    expect(setComponentsId('a')('x')).toBe('id-a-x');
    expect(setComponentsId('b')('x')).toBe('id-b-x');
  });
});
