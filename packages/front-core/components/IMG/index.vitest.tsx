import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import renderWithTheme from 'core/testHelpers/renderWithTheme';
import IMGPreview from 'core/components/IMG';

describe('IMGPreview', () => {
  it('renders the image with the given url and alt text', () => {
    renderWithTheme(<IMGPreview imageUrl="https://example.com/a.png" fileName="a.png" />);
    const img = screen.getByAltText('a.png') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/a.png');
  });

  it('calls handleDownload when the download button is clicked', () => {
    const handleDownload = vi.fn();
    renderWithTheme(<IMGPreview handleDownload={handleDownload} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleDownload).toHaveBeenCalled();
  });
});
