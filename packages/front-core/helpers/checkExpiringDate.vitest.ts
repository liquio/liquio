import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.doUnmock('./configLoader');
  vi.resetModules();
});

describe('checkExpiringDate', () => {
  it('returns false when no expiry warning threshold is configured', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({}) }));
    const { default: checkExpiringDate } = await import('helpers/checkExpiringDate');
    expect(checkExpiringDate({ certBeginTime: '2024-01-01' })).toBe(false);
  });

  it('reports the number of days left when the cert is expiring soon', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({ certificateExpWarning: 30 }) }));
    const { default: checkExpiringDate } = await import('helpers/checkExpiringDate');
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(['9', '10']).toContain(
      checkExpiringDate({ certBeginTime: '2024-01-01', privKeyEndTime: in10Days, certEndTime: in10Days })
    );
  });

  it('returns false when neither key nor cert is close to expiring', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({ certificateExpWarning: 5 }) }));
    const { default: checkExpiringDate } = await import('helpers/checkExpiringDate');
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(checkExpiringDate({ certBeginTime: '2024-01-01', privKeyEndTime: in30Days, certEndTime: in30Days })).toBe(
      false
    );
  });
});
