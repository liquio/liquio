import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import renderWithTheme from 'core/testHelpers/renderWithTheme';
import EmptyPage from 'core/components/EmptyPage';

describe('EmptyPage', () => {
  it('renders the title and description', () => {
    renderWithTheme(<EmptyPage title="Nothing here" description="Try again later" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Try again later')).toBeTruthy();
  });

  it('renders the given Icon component when provided', () => {
    const Icon = () => <svg data-testid="icon" />;
    renderWithTheme(<EmptyPage Icon={Icon} />);
    expect(screen.getByTestId('icon')).toBeTruthy();
  });
});
