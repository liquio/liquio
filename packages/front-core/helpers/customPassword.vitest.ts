import { describe, expect, it } from 'vitest';
import customPassword from 'helpers/customPassword';

describe('customPassword', () => {
  it('generates a password meeting the strength requirements', () => {
    const password = customPassword();
    expect(password.length).toBeGreaterThanOrEqual(12);
    expect((password.match(/[A-Z]/g) || []).length).toBeGreaterThanOrEqual(3);
    expect((password.match(/[a-z]/g) || []).length).toBeGreaterThanOrEqual(3);
    expect((password.match(/\d/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((password.match(/[?-]/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
