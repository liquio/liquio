import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import renderWithTranslations from '../testHelpers/renderWithTranslations';
import Terms from 'containers/Terms';

const translations = {
  locale: 'en',
  Terms: { TERMS_BODY: '<h2>Rules</h2><p class="x">Be <b>kind</b></p><script>alert(1)</script>' },
  Layout: {},
};

const renderTerms = (props: Record<string, unknown> = {}) =>
  renderWithTranslations(
    <MemoryRouter>
      <Terms {...props} />
    </MemoryRouter>,
    translations,
  );

describe('containers/Terms', () => {
  // jsdom has no ResizeObserver, which the Scrollbar's react-resize-detector needs.
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the translated TERMS_BODY as sanitized HTML', () => {
    const { getByText, container } = renderTerms();
    expect(getByText('Rules').tagName).toBe('H2');
    expect(getByText('kind').tagName).toBe('B');
    expect(container.querySelector('script')).toBeNull();
  });

  it('puts the text in a focusable box styled with the theme outline colour', () => {
    const { getByText } = renderTerms();
    const box = getByText('Rules').parentElement as HTMLElement;
    expect(box).toHaveAttribute('tabindex', '0');
    expect(box.className).toMatch(/makeStyles-root-\d+/);
  });

  it('renders inside the full page layout with the default "terms" component id', () => {
    const { container } = renderTerms();
    expect(container.querySelector('#id-terms-content2')).not.toBeNull();
    expect(container.querySelector('#id-terms-link-logo')).toHaveAttribute('href', '/');
  });

  it('passes a custom setId to the layout', () => {
    const { container } = renderTerms({ setId: (name: string) => `my-${name}` });
    expect(container.querySelector('#my-content2')).not.toBeNull();
  });

  it('wraps the page in a scrollbar', () => {
    const { container } = renderTerms();
    expect(container.querySelector('.scrollbar-container')).not.toBeNull();
  });
});
