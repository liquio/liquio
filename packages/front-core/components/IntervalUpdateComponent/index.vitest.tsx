import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import IntervalUpdateComponent from 'core/components/IntervalUpdateComponent';

afterEach(() => vi.useRealTimers());

describe('IntervalUpdateComponent', () => {
  it('re-renders with an updated timestamp on each interval tick', () => {
    vi.useFakeTimers();
    const times: number[] = [];
    render(
      <IntervalUpdateComponent
        interval={100}
        render={(time) => {
          times.push(time);
          return <span>{time}</span>;
        }}
      />
    );
    expect(times).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(times.length).toBeGreaterThan(1);
  });

  it('stops ticking after unmount', () => {
    vi.useFakeTimers();
    const renderFn = vi.fn(() => null);
    const { unmount } = render(<IntervalUpdateComponent interval={50} render={renderFn} />);
    const callsBeforeUnmount = renderFn.mock.calls.length;
    unmount();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(renderFn.mock.calls.length).toBe(callsBeforeUnmount);
  });
});
