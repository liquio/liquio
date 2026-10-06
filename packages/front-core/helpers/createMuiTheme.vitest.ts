import { describe, expect, it } from 'vitest';
import type { PaletteMode } from '@mui/material';
import createMuiTheme from 'helpers/createMuiTheme';

type MuiButtonComponent = { styleOverrides?: unknown; defaultProps?: unknown };

describe('createMuiTheme', () => {
  it('migrates v4-style overrides into v5 styleOverrides', () => {
    const theme = createMuiTheme({ overrides: { MuiButton: { root: { color: 'red' } } } });
    const components = theme.components as unknown as { MuiButton?: MuiButtonComponent };
    expect(components?.MuiButton?.styleOverrides).toEqual({ root: { color: 'red' } });
  });

  it('migrates v4-style props into v5 defaultProps', () => {
    const theme = createMuiTheme({ props: { MuiButton: { disableRipple: true } } });
    const components = theme.components as unknown as { MuiButton?: MuiButtonComponent };
    expect(components?.MuiButton?.defaultProps).toEqual({ disableRipple: true });
  });

  it('maps a legacy palette.type to palette.mode', () => {
    const theme = createMuiTheme({ palette: { type: 'dark' as PaletteMode } });
    expect(theme.palette.mode).toBe('dark');
  });
});
