import { describe, expect, it, vi } from 'vitest';
import EvaluateError from 'helpers/evaluate/EvaluateError';

vi.mock('@sentry/browser', () => ({
  withScope: (cb: (scope: { setLevel: () => void; setTag: () => void; setExtra: () => void }) => void) =>
    cb({ setLevel: () => undefined, setTag: () => undefined, setExtra: () => undefined }),
  captureException: () => undefined
}));

describe('EvaluateError', () => {
  it('carries the failing function and its params', () => {
    const error = new EvaluateError('boom', 'code', [1, 2]);
    expect(error.message).toBe('boom');
    expect(error.func).toBe('code');
    expect(error.params).toEqual([1, 2]);
  });

  it('commit reports to Sentry and the console without throwing', () => {
    const error = new EvaluateError('boom', 'code', []);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => error.commit({ some: 'info' })).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
