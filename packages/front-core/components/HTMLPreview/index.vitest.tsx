import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import renderWithTheme from 'core/testHelpers/renderWithTheme';
import HTMLPreview from 'core/components/HTMLPreview';

describe('HTMLPreview', () => {
  it('uses the given url for the iframe when provided', () => {
    const { container } = renderWithTheme(<HTMLPreview file={new Blob(['<p>hi</p>'])} url="https://example.com/a.html" fileName="a.html" />);
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe('https://example.com/a.html');
  });

  it('falls back to an object URL for the file when no url is given', () => {
    const { container } = renderWithTheme(<HTMLPreview file={new Blob(['<p>hi</p>'])} />);
    expect(container.querySelector('iframe')?.getAttribute('src')).toMatch(/^blob:/);
  });

  it('calls handleDownload when the download button is clicked', () => {
    const handleDownload = vi.fn();
    renderWithTheme(<HTMLPreview file={new Blob(['x'])} url="https://example.com/a.html" handleDownload={handleDownload} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleDownload).toHaveBeenCalled();
  });
});
