import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import renderWithTheme from 'core/testHelpers/renderWithTheme';
import Media from 'core/components/Media';

describe('Media', () => {
  it('renders a video element for video format', () => {
    const { container } = renderWithTheme(<Media format="video" name="clip" url="https://example.com/a.mp4" />);
    expect(container.querySelector('video source')?.getAttribute('src')).toBe('https://example.com/a.mp4');
  });

  it('renders an audio element for audio format', () => {
    const { container } = renderWithTheme(<Media format="audio" name="clip" url="https://example.com/a.mp3" />);
    expect(container.querySelector('audio source')?.getAttribute('src')).toBe('https://example.com/a.mp3');
  });

  it('calls handleDownload when the download button is clicked', () => {
    const handleDownload = vi.fn();
    renderWithTheme(<Media format="video" name="clip" url="https://example.com/a.mp4" handleDownload={handleDownload} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleDownload).toHaveBeenCalled();
  });
});
