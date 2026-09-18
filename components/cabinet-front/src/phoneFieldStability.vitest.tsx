import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Phone from 'components/JsonSchema/elements/Phone';

vi.mock('components/JsonSchema/components/formElement', () => ({ default: (Component: unknown) => Component }));
vi.mock('components/JsonSchema/components/EJVError', () => ({ default: () => null }));

it('settles after initializing a phone field with a restricted country list', () => {
  vi.spyOn(console, 'error').mockImplementation((message) => {
    if (String(message).includes('Maximum update depth')) throw new Error(String(message));
  });
  render(
    <ThemeProvider theme={createTheme()}>
      <Phone defaultCountry="de" onlyCountries={['de']} name="phone" parentValue={{ phone: '' }} value="" t={() => 'Phone number'} />
    </ThemeProvider>
  );
  expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('+49');
});
