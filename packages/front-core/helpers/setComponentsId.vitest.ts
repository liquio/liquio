import { describe, expect, it } from 'vitest';
import setComponentsId from 'helpers/setComponentsId';

describe('setComponentsId', () => {
  it('joins the page and element name', () => {
    expect(setComponentsId('login')('submit')).toBe('login-submit');
  });
});
