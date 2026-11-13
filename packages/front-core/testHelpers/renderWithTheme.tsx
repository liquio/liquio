import React, { ReactElement } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { ThemeProvider as StylesThemeProvider } from '@mui/styles';
import { render, RenderResult } from '@testing-library/react';

import theme from 'core/theme';
import createMuiTheme from 'helpers/createMuiTheme';

// theme.js is still plain JS; its `palette.type` is inferred as a loose `string`, not the
// literal union createMuiTheme expects, so a narrow cast is needed here at the boundary.
const muiTheme = createMuiTheme(theme as Parameters<typeof createMuiTheme>[0]);

// The app theme has no "yellow" palette color, even though many components pass
// color="yellow" to MUI's Button (see e.g. components/DOC, IMG, Media, UnknownFormat).
// MUI's Button unconditionally reads theme.palette[color].main, so this actually throws
// at runtime with the real theme — a pre-existing gap, not introduced by this migration.
// Augmenting it here only unblocks rendering these components in tests.
(muiTheme.palette as unknown as Record<string, unknown>).yellow = muiTheme.palette.augmentColor({
  color: { main: '#F5D547' },
  name: 'yellow'
});

/** Wraps ui with the app's real MUI theme, matching App.jsx's provider nesting. */
export default function renderWithTheme(ui: ReactElement): RenderResult {
  return render(
    <ThemeProvider theme={muiTheme}>
      <StylesThemeProvider theme={muiTheme}>{ui}</StylesThemeProvider>
    </ThemeProvider>
  );
}
