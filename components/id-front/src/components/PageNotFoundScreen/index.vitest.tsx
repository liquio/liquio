import { describe, expect, it } from 'vitest';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import PageNotFoundScreen from 'components/PageNotFoundScreen';

// withStyles wraps the translate() HOC, so JSS names the classes after that wrapper: `Translator-<key>-N`.
describe('PageNotFoundScreen', () => {
  it('renders the red error icon, the translated header and the translated message', () => {
    const { container, getByText } = renderWithTranslations(<PageNotFoundScreen />);
    expect(container.querySelector('[data-testid="ErrorOutlineIcon"]')?.getAttribute('class')).toMatch(/Translator-icon-\d+/);
    expect(getByText('Error')).toBeInTheDocument();
    expect(getByText('Page not found')).toBeInTheDocument();
  });

  it('centres the two titles and the content with the title class', () => {
    const { container } = renderWithTranslations(<PageNotFoundScreen />);
    const titled = container.querySelectorAll('[class*="Translator-title-"]');
    expect(titled).toHaveLength(3);
    expect(container.querySelectorAll('h2.MuiDialogTitle-root')).toHaveLength(2);
    expect(container.querySelector('.MuiDialogContent-root')).toHaveTextContent('Page not found');
  });
});
