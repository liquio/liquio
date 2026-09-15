import React from 'react';
import { ThemeProvider, StyledEngineProvider, createTheme } from '@mui/material/styles';

function MockTheme({ children }) {
  const theme = createTheme({});

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </StyledEngineProvider>
  );
}

export default MockTheme;
