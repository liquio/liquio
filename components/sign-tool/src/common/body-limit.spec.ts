import { applyBodyLimit, DEFAULT_ACCEPTED_BODY_SIZE } from './body-limit';

describe('applyBodyLimit', () => {
  it('defaults to 10mb when not configured', () => {
    const app = { use: jest.fn() };
    expect(applyBodyLimit(app as any, undefined)).toBe(DEFAULT_ACCEPTED_BODY_SIZE);
    expect(DEFAULT_ACCEPTED_BODY_SIZE).toBe('10mb');
    expect(app.use).toHaveBeenCalledTimes(2);
  });

  it('uses the configured size', () => {
    expect(applyBodyLimit({ use: jest.fn() } as any, '2mb')).toBe('2mb');
  });
});
