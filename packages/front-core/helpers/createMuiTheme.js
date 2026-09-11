import { createTheme } from '@mui/material/styles';

const migrateV4ThemeOptions = (themeOptions = {}) => {
  const {
    components = {},
    overrides,
    props,
    palette,
    ...rest
  } = themeOptions;

  const migratedComponents = { ...components };

  Object.entries(overrides || {}).forEach(([componentName, styleOverrides]) => {
    migratedComponents[componentName] = {
      ...migratedComponents[componentName],
      styleOverrides: {
        ...(migratedComponents[componentName]?.styleOverrides || {}),
        ...styleOverrides,
      },
    };
  });

  Object.entries(props || {}).forEach(([componentName, defaultProps]) => {
    migratedComponents[componentName] = {
      ...migratedComponents[componentName],
      defaultProps: {
        ...(migratedComponents[componentName]?.defaultProps || {}),
        ...defaultProps,
      },
    };
  });

  return {
    ...rest,
    ...(palette
      ? {
          palette: {
            ...palette,
            ...(palette.type && !palette.mode ? { mode: palette.type } : {}),
          },
        }
      : {}),
    components: migratedComponents,
  };
};

export default function createMuiTheme(themeOptions) {
  return createTheme(migrateV4ThemeOptions(themeOptions));
}
