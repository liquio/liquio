import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';

import renderWithTheme from '../../testHelpers/renderWithTheme';
import Scrollbar from 'components/Scrollbar';

// jsdom has no ResizeObserver, which react-resize-detector needs. Tests can fire it by hand.
const observers: Array<() => void> = [];
class FakeResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    observers.push(() => callback([{ contentRect: { width: 100, height: 50 } } as ResizeObserverEntry], this as unknown as ResizeObserver));
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const container = (root: HTMLElement) => root.querySelector('.scrollbar-container') as HTMLElement;

describe('Scrollbar', () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders the children inside a perfect-scrollbar container with the hidden-native-scroll class', () => {
    const { container: root, getByText } = renderWithTheme(
      <Scrollbar>
        <p>content</p>
      </Scrollbar>
    );
    const bar = container(root);
    expect(bar).toHaveClass('scrollbar-container');
    expect(bar.className).toMatch(/Scrollbar-hideDefaultScroll-\d+/);
    expect(bar.className).not.toMatch(/Scrollbar-containLayout-\d+/);
    expect(bar).toHaveClass('ps');
    expect(getByText('content').parentElement?.parentElement).toBe(bar);
  });

  it('adds the containLayout class only when containLayout is set', () => {
    const { container: root } = renderWithTheme(
      <Scrollbar containLayout={true}>
        <p>content</p>
      </Scrollbar>
    );
    expect(container(root).className).toMatch(/Scrollbar-containLayout-\d+/);
  });

  it('forwards unknown props (style, id) to the container, after its own props', () => {
    const { container: root } = renderWithTheme(
      <Scrollbar style={{ height: 120 }} id="scroller">
        <p>content</p>
      </Scrollbar>
    );
    expect(container(root)).toHaveAttribute('id', 'scroller');
    expect(container(root)).toHaveStyle({ height: '120px' });
  });

  it('initialises perfect-scrollbar with minScrollbarLength 50 and lets options override it', () => {
    type Settings = { settings: { minScrollbarLength: number; suppressScrollX: boolean } };
    const first = vi.fn();
    renderWithTheme(
      <Scrollbar {...({ onSync: first } as object)}>
        <p>content</p>
      </Scrollbar>
    );
    const defaults = (first.mock.calls.at(-1) as [Settings])[0].settings;
    expect(defaults.minScrollbarLength).toBe(50);
    expect(defaults.suppressScrollX).toBe(false);

    const second = vi.fn();
    renderWithTheme(
      <Scrollbar options={{ minScrollbarLength: 10, suppressScrollX: true }} {...({ onSync: second } as object)}>
        <p>content</p>
      </Scrollbar>
    );
    const overridden = (second.mock.calls.at(-1) as [Settings])[0].settings;
    expect(overridden.minScrollbarLength).toBe(10);
    expect(overridden.suppressScrollX).toBe(true);
  });

  it('syncs the scrollbar when the content is resized', () => {
    const onSync = vi.fn();
    const extra = { onSync } as object;
    renderWithTheme(
      <Scrollbar {...extra}>
        <p>content</p>
      </Scrollbar>
    );
    const before = onSync.mock.calls.length;
    act(() => observers.forEach((fire) => fire()));
    expect(onSync.mock.calls.length).toBeGreaterThan(before);
  });

  describe('Safari workaround after reaching the end of the scroll', () => {
    const reachEnd = (root: HTMLElement) => act(() => void container(root).dispatchEvent(new Event('ps-y-reach-end')));

    it('re-syncs 200 ms after the end is reached in Safari', () => {
      vi.useFakeTimers();
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) AppleWebKit/605 Version/17 Safari/605');
      const onSync = vi.fn();
      const extra = { onSync } as object;
      const { container: root } = renderWithTheme(
        <Scrollbar {...extra}>
          <p>content</p>
        </Scrollbar>
      );
      reachEnd(root);
      const afterEvent = onSync.mock.calls.length;
      act(() => void vi.advanceTimersByTime(199));
      expect(onSync.mock.calls.length).toBe(afterEvent);
      act(() => void vi.advanceTimersByTime(1));
      expect(onSync.mock.calls.length).toBe(afterEvent + 1);
    });

    it('debounces repeated end events into one re-sync', () => {
      vi.useFakeTimers();
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Safari/605');
      const onSync = vi.fn();
      const extra = { onSync } as object;
      const { container: root } = renderWithTheme(
        <Scrollbar {...extra}>
          <p>content</p>
        </Scrollbar>
      );
      reachEnd(root);
      act(() => void vi.advanceTimersByTime(100));
      reachEnd(root);
      const afterEvents = onSync.mock.calls.length;
      act(() => void vi.advanceTimersByTime(200));
      expect(onSync.mock.calls.length).toBe(afterEvents + 1);
    });

    it('does nothing when the browser is not Safari', () => {
      vi.useFakeTimers();
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Firefox/130');
      const onSync = vi.fn();
      const extra = { onSync } as object;
      const { container: root } = renderWithTheme(
        <Scrollbar {...extra}>
          <p>content</p>
        </Scrollbar>
      );
      reachEnd(root);
      const afterEvent = onSync.mock.calls.length;
      act(() => void vi.advanceTimersByTime(1000));
      expect(onSync.mock.calls.length).toBe(afterEvent);
    });

    it('cancels a pending re-sync on unmount', () => {
      vi.useFakeTimers();
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Safari/605');
      const onSync = vi.fn();
      const extra = { onSync } as object;
      const { container: root, unmount } = renderWithTheme(
        <Scrollbar {...extra}>
          <p>content</p>
        </Scrollbar>
      );
      reachEnd(root);
      unmount();
      const afterUnmount = onSync.mock.calls.length;
      act(() => void vi.advanceTimersByTime(1000));
      expect(onSync.mock.calls.length).toBe(afterUnmount);
    });
  });
});
