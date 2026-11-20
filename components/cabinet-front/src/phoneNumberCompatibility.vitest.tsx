import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MuiPhoneNumber from 'material-ui-phone-number';

it('renders and edits the phone input with the application React runtime', () => {
  const onChange = vi.fn();
  render(
    <ThemeProvider theme={createTheme()}>
      <MuiPhoneNumber
        defaultCountry="ua"
        onChange={onChange}
        inputProps={{ 'aria-label': 'Phone number' }}
      />
    </ThemeProvider>
  );
  const input = screen.getByRole('textbox', { name: 'Phone number' });
  expect(input).toHaveValue('+380');
  fireEvent.change(input, { target: { value: '+380501234567' } });
  expect(onChange).toHaveBeenCalled();
  expect((input as HTMLInputElement).value.replace(/\D/g, '')).toBe('380501234567');
});
