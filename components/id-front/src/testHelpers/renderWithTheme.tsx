import type { ReactElement, ReactNode } from 'react';
import { StyledEngineProvider, ThemeProvider, createTheme, adaptV4Theme } from '@mui/material/styles';
import { render, type RenderResult } from '@testing-library/react';

import theme from 'themes';

// Same theme construction and provider nesting as src/App.jsx. The MUI v5 ThemeProvider also
// feeds the legacy @mui/styles context used by withStyles, so no second provider is needed.
// themes/index.js is plain JS, so its inferred shape is not the v4 options type adaptV4Theme expects.
const muiTheme = createTheme(adaptV4Theme(theme as Parameters<typeof adaptV4Theme>[0]));

/** The providers as a `wrapper`, so that `rerender` keeps them. */
export function ThemeWrapper({ children }: { children?: ReactNode }) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </StyledEngineProvider>
  );
}

/** Wraps ui with id-front's real MUI theme, matching App.jsx's provider nesting. */
export default function renderWithTheme(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: ThemeWrapper });
}
