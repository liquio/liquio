import { describe, expect, it } from 'vitest';

import renderWithTheme from '../../testHelpers/renderWithTheme';
import EmptyPage from 'components/EmptyPage';

describe('EmptyPage', () => {
  it('renders the title as an h4 and the description as a subtitle', () => {
    const { container } = renderWithTheme(<EmptyPage title="Nothing here" description="Try again later" />);
    const title = container.querySelector('h4');
    expect(title).toHaveTextContent('Nothing here');
    expect(title?.className).toMatch(/EmptyPage-title-\d+/);
    expect(title?.className).toMatch(/MuiTypography-gutterBottom/);
    const subtitle = container.querySelector('h6');
    expect(subtitle).toHaveTextContent('Try again later');
    expect(subtitle?.className).toMatch(/EmptyPage-subtitle-\d+/);
  });

  it('wraps everything in the wrap class', () => {
    const { container } = renderWithTheme(<EmptyPage title="t" description="d" />);
    expect(container.firstElementChild?.className).toMatch(/EmptyPage-wrap-\d+/);
  });

  it('renders an empty div as the default children', () => {
    const { container } = renderWithTheme(<EmptyPage title="t" description="d" />);
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.children).toHaveLength(3);
    expect(wrap.lastElementChild?.tagName).toBe('DIV');
    expect(wrap.lastElementChild).toBeEmptyDOMElement();
  });

  it('renders the given children instead of the default div', () => {
    const { container, getByText } = renderWithTheme(
      <EmptyPage title="t" description="d">
        <button type="button">Retry</button>
      </EmptyPage>
    );
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.children).toHaveLength(3);
    expect(getByText('Retry').parentElement).toBe(wrap);
  });
});
