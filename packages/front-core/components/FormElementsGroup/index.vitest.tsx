import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormElementsGroup from 'core/components/FormElementsGroup';

describe('FormElementsGroup', () => {
  it('renders a label and its children when a label is given', () => {
    render(
      <FormElementsGroup label="Section">
        <span>child</span>
      </FormElementsGroup>
    );
    expect(screen.getByText('Section')).toBeTruthy();
    expect(screen.getByText('child')).toBeTruthy();
  });

  it('omits the label element when none is given', () => {
    const { container } = render(
      <FormElementsGroup>
        <span>child</span>
      </FormElementsGroup>
    );
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
    expect(screen.getByText('child')).toBeTruthy();
  });
});
