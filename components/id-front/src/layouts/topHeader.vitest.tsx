import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import renderWithTranslations from '../testHelpers/renderWithTranslations';
import TopHeaderLayout from 'layouts/topHeader';
import theme from 'themes';

// The bpmn theme sets neither flag; a theme may. They are read at render time, so a test can flip them.
const flags = theme as { useVideoHelp?: boolean; hideHeaderBorder?: boolean };

const renderLayout = (props: Record<string, unknown> = {}) =>
  renderWithTranslations(
    <MemoryRouter>
      <TopHeaderLayout {...props}>
        <p>page body</p>
      </TopHeaderLayout>
    </MemoryRouter>,
  );

describe('layouts/topHeader', () => {
  afterEach(() => {
    delete flags.useVideoHelp;
    delete flags.hideHeaderBorder;
  });

  it('renders the children inside the content card', () => {
    const { getByText, container } = renderLayout();
    expect(getByText('page body')).toBeInTheDocument();
    expect(container.querySelector('#id-top-header-content')).toContainElement(getByText('page body'));
  });

  it('uses the default "top-header" component id', () => {
    const { container } = renderLayout();
    expect(container.querySelector('#id-top-header-main-content-wrapper')).not.toBeNull();
  });

  it('uses a custom setId', () => {
    const { container } = renderLayout({ setId: (name: string) => `my-${name}` });
    expect(container.querySelector('#my-main-content-wrapper')).not.toBeNull();
    expect(container.querySelector('#my-content')).not.toBeNull();
  });

  it('does not render the logo header unless isGreeting is set', () => {
    const { container } = renderLayout();
    expect(container.querySelector('#id-top-header-logo')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders the logo header with a link to "/" and the translated aria-label when isGreeting is set', () => {
    const { container } = renderLayout({ isGreeting: true });
    const link = container.querySelector('#id-top-header-link-logo');
    expect(link).toHaveAttribute('href', '/');
    // `Layout.LOGO` is missing from the English translations (Batch C drift), so the key shows.
    expect(link).toHaveAttribute('aria-label', 'Layout.LOGO');
  });

  it('applies the greeting classes to the body and the wrapper', () => {
    const { container } = renderLayout({ isGreeting: true });
    expect(container.querySelector('#id-top-header-content')?.className).toMatch(/bodyGreetings-\d+/);
    expect(container.querySelector('#id-top-header-main-content-wrapper')?.className).toMatch(/topHeaderLayoutContentGreeting-\d+/);
  });

  it('applies the register classes when isRegister is set', () => {
    const { container } = renderLayout({ isRegister: true });
    expect(container.querySelector('#id-top-header-content')?.className).toMatch(/bodyRegister-\d+/);
    expect(container.querySelector('#id-top-header-main-content-wrapper')?.className).toMatch(/topHeaderLayoutContentRegister-\d+/);
  });

  // Pre-existing bug, kept: `classes.topHeaderLayoutWithFooter` is not defined anywhere in the styles, so for a
  // plain page (neither register nor greeting) the card gets the literal class "undefined".
  it('puts the class "undefined" on the wrapper of a plain page (topHeaderLayoutWithFooter has no style)', () => {
    const { container } = renderLayout();
    expect(container.querySelector('#id-top-header-main-content-wrapper')?.className.split(' ')).toContain('undefined');
  });

  it('does not put the class "undefined" on the wrapper of a register page', () => {
    const { container } = renderLayout({ isRegister: true });
    expect(container.querySelector('#id-top-header-main-content-wrapper')?.className.split(' ')).not.toContain('undefined');
  });

  it('has no video help button with the default theme', () => {
    const { queryByRole } = renderLayout();
    expect(queryByRole('button')).toBeNull();
  });

  it('opens and closes the video dialog when the theme enables useVideoHelp', () => {
    flags.useVideoHelp = true;
    const { getByRole, queryByRole, container } = renderLayout();
    // `Layout.VIDEO_HELP` is missing from the English translations too.
    const button = getByRole('button', { name: /Layout\.VIDEO_HELP/ });
    expect(queryByRole('dialog')).toBeNull();
    fireEvent.click(button);
    expect(getByRole('dialog')).toBeInTheDocument();
    expect(container.ownerDocument.querySelector('iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/bD83fM28x3I');
  });

  it('adds the hideHeaderBorder class to the greeting header when the theme asks for it', () => {
    flags.hideHeaderBorder = true;
    const { container } = renderLayout({ isGreeting: true });
    expect(container.querySelector('#id-top-header-logo')?.className).toMatch(/hideHeaderBorder-\d+/);
  });
});
