import { describe, expect, it, vi } from 'vitest';
import { Waiter } from 'helpers/waitForAction';

describe('Waiter', () => {
  it('runs the action after the delay and calls onFinish once all actions settle', async () => {
    vi.useFakeTimers();
    const waiter = new Waiter();
    const action = vi.fn();
    const onFinish = vi.fn();
    waiter.onFinish(onFinish);

    const pending = waiter.addAction('key', action, 100);
    expect(waiter.hasAction('key')).toBe(true);

    await vi.advanceTimersByTimeAsync(100);
    await pending;

    expect(action).toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalled();
    expect(waiter.hasAction('key')).toBe(false);
    vi.useRealTimers();
  });

  it('cancels a pending action when removed', () => {
    vi.useFakeTimers();
    const waiter = new Waiter();
    const action = vi.fn();
    waiter.addAction('key', action, 100);
    waiter.removeAction('key');
    vi.advanceTimersByTime(200);
    expect(action).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
