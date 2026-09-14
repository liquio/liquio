import { describe, expect, it } from 'vitest';
import renderWithTheme from 'core/testHelpers/renderWithTheme';
import BlockQuote from 'core/components/BlockQuote';

describe('BlockQuote', () => {
  it('renders the title as sanitized HTML inside a blockquote', () => {
    const { container } = renderWithTheme(<BlockQuote title="Hello <b>world</b>" />);
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container.querySelector('b')?.textContent).toBe('world');
  });

  it('applies the variant class name', () => {
    const { container } = renderWithTheme(<BlockQuote title="text" variant="error" />);
    const classAttr = container.querySelector('blockquote')?.className || '';
    expect(classAttr.length).toBeGreaterThan(0);
  });
});
