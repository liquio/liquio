import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import renderWithTheme from 'core/testHelpers/renderWithTheme';
import DOCPreview from 'core/components/DOC';

describe('DOCPreview', () => {
  it('embeds the doc URL via the Google viewer', () => {
    const { container } = renderWithTheme(<DOCPreview docUrl="https://example.com/a.docx" fileName="a.docx" />);
    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe('https://docs.google.com/viewer?url=https://example.com/a.docx&embedded=true&a=bi');
    expect(iframe?.getAttribute('title')).toBe('a.docx');
  });

  it('calls handleDownload when the download button is clicked', () => {
    const handleDownload = vi.fn();
    renderWithTheme(<DOCPreview handleDownload={handleDownload} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleDownload).toHaveBeenCalled();
  });
});
