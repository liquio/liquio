import { beforeEach, describe, expect, it, vi } from 'vitest';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import Logo from 'components/Logo';

const mocks = vi.hoisted(() => ({ theme: {} as { headerImage?: unknown } }));

vi.mock('themes', () => ({ default: mocks.theme }));

const translations = { locale: 'en', Layout: { logo: 'Company logo' } };

describe('Logo', () => {
  beforeEach(() => {
    delete mocks.theme.headerImage;
  });

  it('renders nothing when the theme has no headerImage (the bpmn theme has none)', () => {
    const { container } = renderWithTranslations(<Logo />, translations);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a base64 data URI as a full-height image with the translated alt text', () => {
    mocks.theme.headerImage = 'data:image/png;base64,AAAA';
    const { container } = renderWithTranslations(<Logo />, translations);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(img).toHaveAttribute('alt', 'Company logo');
    expect(img).toHaveStyle({ height: '100%' });
  });

  it('renders nothing for a string that is not a data URI', () => {
    mocks.theme.headerImage = '/static/logo.png';
    const { container } = renderWithTranslations(<Logo />, translations);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a React component headerImage', () => {
    mocks.theme.headerImage = () => <svg data-testid="custom-logo" />;
    const { getByTestId } = renderWithTranslations(<Logo />, translations);
    expect(getByTestId('custom-logo')).toBeInTheDocument();
  });

  it('renders nothing for any other headerImage value', () => {
    mocks.theme.headerImage = { src: 'x' };
    const { container } = renderWithTranslations(<Logo />, translations);
    expect(container).toBeEmptyDOMElement();
  });
});
