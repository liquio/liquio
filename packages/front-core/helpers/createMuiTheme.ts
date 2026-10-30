import { createTheme, Theme, ThemeOptions } from '@mui/material/styles';

interface LegacyThemeOptions extends Omit<ThemeOptions, 'components'> {
  components?: Record<string, Record<string, unknown>>;
  overrides?: Record<string, unknown>;
  props?: Record<string, Record<string, unknown>>;
  palette?: ThemeOptions['palette'] & { type?: 'light' | 'dark' };
}

const migrateV4ThemeOptions = (themeOptions: LegacyThemeOptions = {}): ThemeOptions => {
  const { components = {}, overrides, props, palette, ...rest } = themeOptions;

  const migratedComponents: Record<string, Record<string, unknown>> = { ...components };

  Object.entries(overrides || {}).forEach(([componentName, styleOverrides]) => {
    migratedComponents[componentName] = {
      ...migratedComponents[componentName],
      styleOverrides: {
        ...((migratedComponents[componentName]?.styleOverrides as object) || {}),
        ...(styleOverrides as object)
      }
    };
  });

  Object.entries(props || {}).forEach(([componentName, defaultProps]) => {
    migratedComponents[componentName] = {
      ...migratedComponents[componentName],
      defaultProps: {
        ...((migratedComponents[componentName]?.defaultProps as object) || {}),
        ...defaultProps
      }
    };
  });

  return {
    ...rest,
    ...(palette
      ? {
          palette: {
            ...palette,
            ...(palette.type && !palette.mode ? { mode: palette.type } : {})
          }
        }
      : {}),
    components: migratedComponents
  } as ThemeOptions;
};

export default function createMuiTheme(themeOptions: LegacyThemeOptions): Theme {
  return createTheme(migrateV4ThemeOptions(themeOptions));
}
