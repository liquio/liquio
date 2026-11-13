import { describe, expect, it, vi } from 'vitest';

describe('userIsResident', () => {
  it('is true when one of the auth units matches the resident id', async () => {
    vi.doMock('store', () => ({
      default: { getState: () => ({ auth: { units: [{ id: 1000770 }] } }) }
    }));
    const { default: userIsResident } = await import('helpers/userIsResident');
    expect(userIsResident()).toBe(true);
    vi.doUnmock('store');
  });

  it('is false when there are no matching units', async () => {
    vi.doMock('store', () => ({ default: { getState: () => ({ auth: { units: [] } }) } }));
    vi.resetModules();
    const { default: userIsResident } = await import('helpers/userIsResident');
    expect(userIsResident()).toBe(false);
    vi.doUnmock('store');
  });
});
