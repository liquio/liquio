import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

afterEach(() => {
  vi.doUnmock('core/helpers/configLoader');
  vi.resetModules();
});

describe('ModulePage', () => {
  it('sets document.title from the translated title and app name on mount', async () => {
    vi.doMock('core/helpers/configLoader', () => ({ getConfig: () => ({ application: { name: 'App' } }) }));
    const { default: ModulePage } = await import('core/components/ModulePage');
    // ModulePage is a base class meant to be subclassed with a real render(); it defines none itself.
    class Page extends ModulePage {
      render() {
        return null;
      }
    }
    render(<Page t={(key: string) => `translated ${key}`} title="PAGE_TITLE" />);
    expect(document.title).toBe('translated PAGE_TITLE - App');
  });

  it('prefers componentGetTitle when a subclass provides one', async () => {
    vi.doMock('core/helpers/configLoader', () => ({ getConfig: () => ({ application: { name: 'App' } }) }));
    const { default: ModulePage } = await import('core/components/ModulePage');
    class Sub extends ModulePage {
      componentGetTitle = () => 'Custom Title';
      render() {
        return null;
      }
    }
    render(<Sub />);
    expect(document.title).toBe('Custom Title - App');
  });
});
