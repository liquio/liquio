import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor, within } from '@testing-library/react';
import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import CustomDatePicker from 'components/CustomInput/CustomDatePicker';

const translations = {
  locale: 'en',
  DatePicker: { Clear: 'Clear date', ACCEPT: 'Accept', BtnPrevMonth: 'Prev month', BtnNextMonth: 'Next month' },
};

type Props = Partial<ComponentProps<typeof CustomDatePicker>>;

const renderPicker = (props: Props = {}) => {
  const onChange = vi.fn();
  const handleNextStep = vi.fn();
  const utils = renderWithTranslations(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <CustomDatePicker label="Birthday" setId={(name) => `id-${name}`} onChange={onChange} handleNextStep={handleNextStep} {...props} />
    </LocalizationProvider>,
    translations
  );
  const input = utils.container.querySelector('input') as HTMLInputElement;
  return { ...utils, onChange, handleNextStep, input };
};

// The component passes v4-style props through a loose cast to the installed @mui/x-date-pickers v5, so the
// picker ignores `format` (it uses its own MM/DD/YYYY input format), while onChange formats with `dateFormat`.
describe('CustomDatePicker', () => {
  beforeEach(() => {
    // React warns about the lowercase `autocomplete` input prop and MUI about the unknown v4 props.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('renders a labelled text input with the fixed accessibility attributes', () => {
    const { input, getByText } = renderPicker();
    expect(getByText('Birthday')).toBeInTheDocument();
    expect(input).toHaveAttribute('role', 'button');
    expect(input).toHaveAttribute('tabindex', '0');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('placeholder', '');
    expect(input.value).toBe('');
  });

  it('uses the default label "default" when no label is given', () => {
    const { getByText } = renderPicker({ label: undefined });
    expect(getByText('default')).toBeInTheDocument();
  });

  it('shows neither the clear nor the accept button without a value', () => {
    const { queryByLabelText, queryByText } = renderPicker();
    expect(queryByLabelText('Clear date')).toBeNull();
    expect(queryByText('Accept')).toBeNull();
  });

  it('calls onChange with the date formatted as DD/MM/YYYY by default', () => {
    const { input, onChange } = renderPicker();
    // The v5 picker reads typed text as MM/DD/YYYY: Jan 2nd.
    fireEvent.change(input, { target: { value: '01/02/1990' } });
    expect(onChange).toHaveBeenLastCalledWith('02/01/1990');
  });

  it('formats the value with a custom dateFormat', () => {
    const { input, onChange } = renderPicker({ dateFormat: 'YYYY-MM-DD' });
    fireEvent.change(input, { target: { value: '01/02/1990' } });
    expect(onChange).toHaveBeenLastCalledWith('1990-01-02');
  });

  it('shows the accept button once a date is chosen, and it calls handleNextStep', () => {
    const { input, getByText, handleNextStep } = renderPicker();
    fireEvent.change(input, { target: { value: '01/02/1990' } });
    const accept = getByText('Accept');
    expect(accept).toHaveAttribute('aria-label', 'Accept');
    expect(accept).toHaveClass('MuiButton-contained');
    fireEvent.click(accept);
    expect(handleNextStep).toHaveBeenCalledTimes(1);
  });

  it('starts from the value prop (a string or a dayjs) and shows the buttons for it', () => {
    const fromString = renderPicker({ value: '01/02/1990' });
    expect(fromString.input.value).toBe('01/02/1990');
    expect(fromString.getByLabelText('Clear date')).toBeInTheDocument();
    expect(fromString.getByText('Accept')).toBeInTheDocument();
    document.body.innerHTML = '';
    const fromDayjs = renderPicker({ value: dayjs('1991-03-04') });
    expect(fromDayjs.input.value).toBe('03/04/1991');
    expect(fromDayjs.getByText('Accept')).toBeInTheDocument();
  });

  it('treats an empty value as no date', () => {
    const { queryByText, input } = renderPicker({ value: '' });
    expect(input.value).toBe('');
    expect(queryByText('Accept')).toBeNull();
  });

  it('hides the accept button for the string "Invalid Date"', () => {
    const { queryByText } = renderPicker({ value: 'Invalid Date' });
    expect(queryByText('Accept')).toBeNull();
  });

  it('clears the date: onChange("") and both buttons go away', () => {
    const { getByLabelText, queryByText, queryByLabelText, input, onChange } = renderPicker({ value: '01/02/1990' });
    fireEvent.click(getByLabelText('Clear date'));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(input.value).toBe('');
    expect(queryByText('Accept')).toBeNull();
    expect(queryByLabelText('Clear date')).toBeNull();
  });

  it('opens the calendar when the input is clicked and closes it on Escape', async () => {
    const { input } = renderPicker({ value: '01/02/1990' });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    fireEvent.click(input);
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('January 1990')).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(document.body.querySelector('[role="dialog"]')).toBeNull());
  });

  it('calls onChange when a day is picked in the calendar', () => {
    const { input, onChange } = renderPicker({ value: '01/02/1990' });
    fireEvent.click(input);
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialog).getByText('15'));
    expect(onChange).toHaveBeenLastCalledWith('15/01/1990');
  });

  // Pre-existing: leftArrowButtonProps/rightArrowButtonProps are v4 props, so the translated labels never apply.
  it('keeps the picker default arrow labels (the translated arrow labels are ignored by v5)', () => {
    const { input } = renderPicker({ value: '01/02/1990' });
    fireEvent.click(input);
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    expect(within(dialog).getByLabelText('Previous month')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Next month')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Prev month')).toBeNull();
  });

  it('disables days after maxDate', () => {
    const { input } = renderPicker({ value: '01/02/1990', maxDate: dayjs('1990-01-10') });
    fireEvent.click(input);
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    expect(within(dialog).getByText('10')).not.toBeDisabled();
    expect(within(dialog).getByText('11')).toBeDisabled();
  });

  it('disables days before minDate', () => {
    const { input } = renderPicker({ value: '01/20/1990', minDate: dayjs('1990-01-10') });
    fireEvent.click(input);
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    expect(within(dialog).getByText('9')).toBeDisabled();
    expect(within(dialog).getByText('10')).not.toBeDisabled();
  });

  it('wraps the picker in the relative container and gives the field the inputWrap class', () => {
    const { container } = renderPicker({ name: 'birthday' });
    expect(container.querySelector('[class*="KeyboardDatePicker-inputWrap"]')).toBeInTheDocument();
    expect(container.firstElementChild?.className).toMatch(/KeyboardDatePicker-relative-\d+/);
  });
});
