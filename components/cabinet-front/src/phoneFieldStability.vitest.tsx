import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ThemeProvider as StylesThemeProvider } from '@mui/styles';
import Phone from 'components/JsonSchema/elements/Phone';

vi.mock('react-translate', () => ({ translate: () => (Component: unknown) => Component, useTranslate: () => (key: string) => key }));
vi.mock('components/JsonSchema/components/FieldLabel', () => ({ default: () => null }));
vi.mock('components/JsonSchema/components/EJVError', () => ({ default: () => null }));

it('settles after initializing a phone field with a restricted country list', () => {
  vi.spyOn(console, 'error').mockImplementation((message) => {
    if (String(message).includes('Maximum update depth')) throw new Error(String(message));
  });
  render(
    <ThemeProvider theme={createTheme()}><StylesThemeProvider theme={createTheme()}>
      <Phone defaultCountry="de" onlyCountries={['de']} name="phone" parentValue={{ phone: '' }} value="" t={() => 'Phone number'} />
    </StylesThemeProvider></ThemeProvider>
  );
  expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('+49');
});

 it('settles while typing into a controlled phone field', () => {
  const onChange = vi.fn();
  const Harness = () => {
    const [value, setValue] = React.useState('');
    return <Phone defaultCountry="ua" name="phone" parentValue={{ phone: value }} value={value}
      t={() => 'Phone number'} onChange={(next: string) => { onChange(next); setValue(next); }} />;
  };
  render(<ThemeProvider theme={createTheme()}><StylesThemeProvider theme={createTheme()}><Harness /></StylesThemeProvider></ThemeProvider>);
  const input = screen.getByRole('textbox', { name: 'Phone number' });
  fireEvent.focus(input);
  for (const value of ['+3805', '+38050', '+380501234567']) {
    fireEvent.change(input, { target: { value } });
    expect((input as HTMLInputElement).value.replace(/\D/g, '')).toBe(value.slice(1));
  }
  expect(onChange).toHaveBeenCalledTimes(3);
});
