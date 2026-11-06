import { describe, expect, it } from 'vitest';

import renderWithTheme from '../../testHelpers/renderWithTheme';
import Preloader from 'components/Preloader';

describe('Preloader', () => {
  it('renders the wrapper with its id, the default loader and a progress circle', () => {
    const { container } = renderWithTheme(<Preloader />);
    const wrap = container.querySelector('#id-preloader-wrap-');
    expect(wrap).toBeInTheDocument();
    expect(wrap?.className).toMatch(/Preloader-mainWrapper-\d+/);
    expect(wrap?.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('wraps the circle in the centred container and box', () => {
    const { container } = renderWithTheme(<Preloader />);
    const progress = container.querySelector('[role="progressbar"]');
    expect(progress?.parentElement?.className).toMatch(/boxDef/);
    expect(progress?.parentElement?.parentElement?.className).toMatch(/containerDef/);
  });

  it('ignores a `flex` prop: BlockScreen used to pass flex={true}, which never reached the DOM', () => {
    const plain = renderWithTheme(<Preloader />).container.innerHTML;
    document.body.innerHTML = '';
    const extraProps = { flex: true } as object;
    const withFlex = renderWithTheme(<Preloader {...extraProps} />).container.innerHTML;
    expect(withFlex.replace(/-\d+/g, '')).toBe(plain.replace(/-\d+/g, ''));
  });
});
