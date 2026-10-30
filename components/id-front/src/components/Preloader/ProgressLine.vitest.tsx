import { describe, expect, it } from 'vitest';

import renderWithTheme from '../../testHelpers/renderWithTheme';
import ProgressLine from 'components/Preloader/ProgressLine';

describe('ProgressLine', () => {
  it('renders only the root line while not loading (loading defaults to false)', () => {
    const { container } = renderWithTheme(<ProgressLine />);
    expect(container.firstElementChild?.className).toMatch(/ProgressLine-root-\d+/);
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(container.firstElementChild?.childElementCount).toBe(0);
  });

  it('renders a linear progress with the aria label while loading', () => {
    const { container } = renderWithTheme(<ProgressLine loading={true} ariaLabel="Loading data" />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-label', 'Loading data');
    expect(bar?.className).toMatch(/ProgressLine-progress-\d+/);
  });

  it('applies the style prop to the root, and a null or missing style adds no attribute', () => {
    const styled = renderWithTheme(<ProgressLine style={{ opacity: 0.5 }} />);
    expect(styled.container.firstElementChild).toHaveStyle({ opacity: '0.5' });
    document.body.innerHTML = '';
    const nulled = renderWithTheme(<ProgressLine style={null} />);
    expect(nulled.container.firstElementChild).not.toHaveAttribute('style');
    document.body.innerHTML = '';
    const missing = renderWithTheme(<ProgressLine />);
    expect(missing.container.firstElementChild).not.toHaveAttribute('style');
  });
});
