import { describe, expect, it } from 'vitest';

import renderWithTheme from '../../testHelpers/renderWithTheme';
import BlockScreen from 'components/BlockScreen';

describe('BlockScreen', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithTheme(<BlockScreen open={false} />);
    expect(container).toBeEmptyDOMElement();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders a dialog with the preloader when open', () => {
    renderWithTheme(<BlockScreen open={true} />);
    expect(document.body.querySelector('[role="dialog"]')).toBeInTheDocument();
    expect(document.body.querySelector('[role="progressbar"], svg')).toBeInTheDocument();
    expect(document.body.querySelector('#id-preloader-wrap-')).toBeInTheDocument();
  });

  it('gives the dialog paper the transparent paper class', () => {
    renderWithTheme(<BlockScreen open={true} />);
    expect(document.body.querySelector('.MuiDialog-paper')?.className).toMatch(/BlockScreen-dialogPaper-\d+/);
  });

  it('does not add the transparent dialog class by default', () => {
    renderWithTheme(<BlockScreen open={true} />);
    expect(document.body.querySelector('.MuiDialog-root')?.className).not.toMatch(/BlockScreen-dialog-\d+/);
  });

  it('adds the transparent dialog class with transparentBackground', () => {
    renderWithTheme(<BlockScreen open={true} transparentBackground={true} />);
    expect(document.body.querySelector('.MuiDialog-root')?.className).toMatch(/BlockScreen-dialog-\d+/);
  });

  it('does not add the transparent dialog class when transparentBackground is false', () => {
    renderWithTheme(<BlockScreen open={true} transparentBackground={false} />);
    expect(document.body.querySelector('.MuiDialog-root')?.className).not.toMatch(/BlockScreen-dialog-\d+/);
  });
});
