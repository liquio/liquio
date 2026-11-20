import { fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import renderWithTheme from 'core/testHelpers/renderWithTheme';
import { BooleanElement } from './BooleanElement';

vi.mock('../components/ElementContainer', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const classes = { iconSvgFillDark: 'dark' };
const t = (key: string) => key;

describe('BooleanElement', () => {
  it('renders required true/false choices and reports the selected value', () => {
    const onChange = vi.fn();
    renderWithTheme(
      <BooleanElement
        classes={classes}
        t={t}
        path={['step', 'accepted']}
        required={true}
        value={false}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Yes' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
      'id',
      'step-accepted-true',
    );
    expect(screen.getByRole('radio', { name: 'No' })).toHaveAttribute(
      'id',
      'step-accepted-false',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders an optional checkbox and respects read-only state', () => {
    const onChange = vi.fn();
    const { rerender } = renderWithTheme(
      <BooleanElement
        classes={classes}
        t={t}
        description="Subscribe"
        value={null}
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <BooleanElement
        classes={classes}
        t={t}
        description="Subscribe"
        value={false}
        readOnly={true}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Subscribe' })).toBeDisabled();
  });

  it('does not render hidden controls', () => {
    const { container } = renderWithTheme(
      <BooleanElement classes={classes} t={t} hidden={true} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
