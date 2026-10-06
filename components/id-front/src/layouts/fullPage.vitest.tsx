import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import renderWithTranslations from '../testHelpers/renderWithTranslations';
import FullPageLayout from 'layouts/fullPage';

const renderLayout = (props: Record<string, unknown> = {}, children: React.ReactNode = <p>page body</p>) =>
  renderWithTranslations(
    <MemoryRouter>
      <FullPageLayout {...props}>{children}</FullPageLayout>
    </MemoryRouter>,
  );

describe('layouts/fullPage', () => {
  it('renders the children in the body card', () => {
    const { getByText } = renderLayout();
    expect(getByText('page body')).toBeInTheDocument();
  });

  it('renders a logo link to "/"', () => {
    const { container } = renderLayout();
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveAttribute('id', 'id-full-page-link-logo');
  });

  it('uses the default "full-page" component id for its elements', () => {
    const { container } = renderLayout();
    expect(container.querySelector('#id-full-page-content')).not.toBeNull();
    expect(container.querySelector('#id-full-page-content2')).not.toBeNull();
    // `setId('')` names the card itself.
    expect(container.querySelector('#id-full-page-')).not.toBeNull();
    expect(container.querySelector('#id-full-page-footer')).toBeNull();
  });

  it('uses a custom setId', () => {
    const { container } = renderLayout({ setId: (name: string) => `my-${name}` });
    expect(container.querySelector('#my-content')).not.toBeNull();
    expect(container.querySelector('#my-link-logo')).not.toBeNull();
  });

  it('renders the footer card only when a footer is given', () => {
    const { container, getByText } = renderLayout({ footer: <span>the footer</span> });
    expect(getByText('the footer')).toBeInTheDocument();
    expect(container.querySelector('#id-full-page-footer')).not.toBeNull();
  });

  it('does not render the footer card for the empty default footer', () => {
    const { container } = renderLayout({ footer: '' });
    expect(container.querySelector('#id-full-page-footer')).toBeNull();
  });

  it('applies the JSS classes of assets/jss', () => {
    const { container } = renderLayout();
    expect(container.querySelector('#id-full-page-content')?.className).toMatch(/FullPageLayout-topHeaderLayoutContent-\d+/);
    expect(container.querySelector('#id-full-page-content')?.className).toMatch(/FullPageLayout-topHeaderLayout-\d+/);
    expect(container.querySelector('#id-full-page-')?.className).toMatch(/FullPageLayout-fullPageLayout-\d+/);
  });
});
