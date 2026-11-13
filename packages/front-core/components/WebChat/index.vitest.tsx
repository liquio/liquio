import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

afterEach(() => {
  document.querySelectorAll('script').forEach((el) => el.remove());
  vi.doUnmock('core/helpers/configLoader');
  vi.resetModules();
});

describe('WebChat', () => {
  it('renders nothing and does nothing when webChat is not configured', async () => {
    vi.doMock('core/helpers/configLoader', () => ({ getConfig: () => ({}) }));
    const { default: WebChat } = await import('core/components/WebChat');
    const { container } = render(<WebChat />);
    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector('script[channelId]')).toBeNull();
  });

  it('injects the webChat script when configured', async () => {
    vi.doMock('core/helpers/configLoader', () => ({
      getConfig: () => ({ webChat: { dataUrl: 'https://chat.example.com/w.js', channelId: 'c1', id: 'wc' } })
    }));
    const { default: WebChat } = await import('core/components/WebChat');
    render(<WebChat />);
    const script = document.querySelector('script[channelId="c1"]');
    expect(script?.getAttribute('src')).toBe('https://chat.example.com/w.js');
  });
});
