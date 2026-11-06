import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeEvent } from 'react';
import { act, fireEvent } from '@testing-library/react';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import StringElement from 'components/CustomInput/StringElement';

describe('StringElement', () => {
  beforeEach(() => {
    // React warns about the unknown props (setId, t, ...) that are spread onto TextField; see the tests below.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a standard text field with the name, value and the label', () => {
    const { container, getByLabelText } = renderWithTranslations(<StringElement name="email" label="Email" value="a@b.co" onChange={vi.fn()} />);
    const input = getByLabelText('Email') as HTMLInputElement;
    expect(input).toHaveAttribute('name', 'email');
    expect(input.value).toBe('a@b.co');
    expect(container.querySelector('.MuiInput-root')).toBeInTheDocument();
  });

  it('adds * to the label when required', () => {
    const { container } = renderWithTranslations(<StringElement label="Email" required={true} />);
    expect(container.querySelector('label')?.textContent).toMatch(/^Email\*/);
  });

  it('appends the text "undefined" when there is no label (label is concatenated unchecked)', () => {
    const { container } = renderWithTranslations(<StringElement name="x" />);
    expect(container.querySelector('label')?.textContent).toBe('undefined');
  });

  it('defaults to name "", an empty value and type "string"', () => {
    const { container } = renderWithTranslations(<StringElement label="L" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('name', '');
    expect(input.value).toBe('');
    // `type="string"` is not a real input type, so the browser treats it as text.
    expect(input).toHaveAttribute('type', 'string');
    expect(input.type).toBe('text');
  });

  it('passes a given type to the input', () => {
    const { container } = renderWithTranslations(<StringElement label="L" type="password" />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
  });

  it('shrinks the label only when there is a value', () => {
    const empty = renderWithTranslations(<StringElement label="L" value="" />);
    expect(empty.container.querySelector('label')).not.toHaveAttribute('data-shrink', 'true');
    document.body.innerHTML = '';
    const filled = renderWithTranslations(<StringElement label="L" value="x" />);
    expect(filled.container.querySelector('label')).toHaveAttribute('data-shrink', 'true');
  });

  it('calls onChange with the change event when the user types', () => {
    // The field is controlled, so the DOM value is reset after the event; read it inside the handler.
    const seen: string[] = [];
    const onChange = vi.fn((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void seen.push(event.target.value));
    const { getByLabelText } = renderWithTranslations(<StringElement label="Name" value="" onChange={onChange} />);
    const input = getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target).toBe(input);
    expect(onChange.mock.calls[0][0].type).toBe('change');
    expect(seen).toEqual(['ab']);
  });

  it('is controlled by the value prop and follows later changes', () => {
    const { getByLabelText, rerender } = renderWithTranslations(<StringElement label="Name" value="one" />);
    expect((getByLabelText('Name') as HTMLInputElement).value).toBe('one');
    rerender(<StringElement label="Name" value="two" />);
    expect((getByLabelText('Name') as HTMLInputElement).value).toBe('two');
  });

  it('applies the mask while typing', () => {
    const seen: string[] = [];
    const onChange = vi.fn((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void seen.push(event.target.value));
    const { getByLabelText } = renderWithTranslations(<StringElement label="Code" mask="99-99" value="" onChange={onChange} />);
    fireEvent.change(getByLabelText('Code'), { target: { value: '1234' } });
    expect(seen.at(-1)).toBe('12-34');
  });

  it('does not render the mask placeholder (maskPlaceholder is forced to null)', () => {
    const { getByLabelText } = renderWithTranslations(<StringElement label="Code" mask="99-99" value="" />);
    fireEvent.focus(getByLabelText('Code'));
    expect((getByLabelText('Code') as HTMLInputElement).value).toBe('');
  });

  it('forwards the placeholder', () => {
    const { container } = renderWithTranslations(<StringElement label="L" placeholder="type here" />);
    expect(container.querySelector('input')).toHaveAttribute('placeholder', 'type here');
  });

  describe('helper text', () => {
    it('shows the sample text as helper text', () => {
      const { getByText } = renderWithTranslations(<StringElement label="L" sample="e.g. 123" />);
      expect(getByText('e.g. 123')).toHaveClass('MuiFormHelperText-root');
    });

    it('shows the error instead of the sample, in an alert, and marks the field as errored', () => {
      const { getByText, container } = renderWithTranslations(<StringElement label="L" sample="e.g. 123" error="Required" />);
      const helper = getByText('Required');
      expect(helper).toHaveAttribute('role', 'alert');
      expect(helper).toHaveAttribute('aria-live', 'assertive');
      expect(helper).toHaveAttribute('tabindex', '-1');
      expect(helper).toHaveClass('Mui-error');
      expect(container.querySelector('.MuiInput-root')).toHaveClass('Mui-error');
      expect(container.textContent).not.toContain('e.g. 123');
    });

    it('has no alert role when there is only a sample', () => {
      const { getByText } = renderWithTranslations(<StringElement label="L" sample="e.g. 123" />);
      expect(getByText('e.g. 123')).not.toHaveAttribute('role');
    });

    it('hides both the error and the sample when disabled', () => {
      const { container, queryByText } = renderWithTranslations(<StringElement label="L" sample="hint" error="Required" disabled={true} />);
      expect(queryByText('hint')).toBeNull();
      expect(queryByText('Required')).toBeNull();
      expect(container.querySelector('input')).toBeDisabled();
    });

    it('focuses the error text when an error appears, after a timeout', () => {
      vi.useFakeTimers();
      const { rerender, getByText } = renderWithTranslations(<StringElement label="L" />);
      rerender(<StringElement label="L" error="Required" />);
      expect(document.activeElement).not.toBe(getByText('Required'));
      act(() => void vi.advanceTimersByTime(0));
      expect(document.activeElement).toBe(getByText('Required'));
    });

    it('does not move focus when the error was already there', () => {
      vi.useFakeTimers();
      const { rerender, getByText, getByLabelText } = renderWithTranslations(<StringElement label="L" error="Required" />);
      getByLabelText('L').focus();
      rerender(<StringElement label="L" error="Still required" />);
      act(() => void vi.advanceTimersByTime(10));
      expect(getByText('Still required')).not.toBe(document.activeElement);
      expect(document.activeElement).toBe(getByLabelText('L'));
    });
  });

  describe('enum and select', () => {
    const options = { a: 'Apple', b: 'Banana' };

    it('renders a select with one option per enum value when select is set', () => {
      const { container, getByRole } = renderWithTranslations(<StringElement label="Fruit" enum={options} select={true} value="Apple" />);
      expect(container.querySelector('.MuiSelect-select')).toHaveTextContent('Apple');
      fireEvent.mouseDown(getByRole('combobox'));
      const items = document.body.querySelectorAll('[role="option"]');
      expect([...items].map((i) => i.textContent)).toEqual(['Apple', 'Banana']);
    });

    // Pre-existing: `select` is not destructured in render(), so `{...rest}` spreads select={false} (the default
    // prop) over the computed `select || !!enum`. An enum alone therefore never turns the field into a select.
    it('does NOT become a select from an enum alone (the spread overrides the computed select)', () => {
      const { container } = renderWithTranslations(<StringElement label="Fruit" enum={options} value="Apple" />);
      expect(container.querySelector('.MuiSelect-select')).toBeNull();
      expect(container.querySelector('input')).toBeInTheDocument();
    });

    it('passes the children into the select when there is no enum', () => {
      const { getByRole } = renderWithTranslations(
        <StringElement label="Fruit" select={true} value="x">
          <option value="x">Custom</option>
        </StringElement>
      );
      expect(getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('props spread onto TextField', () => {
    // Pre-existing: every prop that render() does not destructure goes to TextField, even `description`.
    it('renders `description` as a DOM attribute on the field root', () => {
      const { container } = renderWithTranslations(<StringElement label="L" description="about" />);
      expect(container.querySelector('.MuiFormControl-root')).toHaveAttribute('description', 'about');
    });

    it('forwards other TextField props such as fullWidth and data attributes', () => {
      const { container } = renderWithTranslations(<StringElement label="L" fullWidth={true} data-testid="field" />);
      expect(container.querySelector('.MuiFormControl-root')).toHaveClass('MuiFormControl-fullWidth');
      expect(container.querySelector('[data-testid="field"]')).toBeInTheDocument();
    });

    it('lets a spread prop override the explicit ones (value over the state value)', () => {
      const { getByLabelText } = renderWithTranslations(<StringElement label="L" value="shown" />);
      expect((getByLabelText('L') as HTMLInputElement).value).toBe('shown');
    });

    it('merges InputProps with the masked input component', () => {
      const { container } = renderWithTranslations(<StringElement label="L" InputProps={{ startAdornment: <span data-testid="adornment" /> }} />);
      expect(container.querySelector('[data-testid="adornment"]')).toBeInTheDocument();
      expect(container.querySelector('input')).toBeInTheDocument();
    });
  });
});
