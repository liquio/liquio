import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import renderWithTheme from 'core/testHelpers/renderWithTheme';
import UnknownFormat from 'core/components/UnknownFormat';

describe('UnknownFormat', () => {
  it('shows the download-only message for binary files', () => {
    renderWithTheme(<UnknownFormat itIsBinary={true} />);
    expect(screen.getByText('ClaimList.DOWNLOAD_ONLY')).toBeTruthy();
  });

  it('shows the not-supported message for non-binary files', () => {
    renderWithTheme(<UnknownFormat itIsBinary={false} />);
    expect(screen.getByText('ClaimList.NOT_SUPPORTED')).toBeTruthy();
  });

  it('calls handleDownload when the download button is clicked', () => {
    const handleDownload = vi.fn();
    renderWithTheme(<UnknownFormat itIsBinary={true} handleDownload={handleDownload} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleDownload).toHaveBeenCalled();
  });
});
