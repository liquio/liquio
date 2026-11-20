// Needed so the `declare module` blocks below augment the real MUI types instead of
// replacing them (a file with no top-level import/export is treated as a global script,
// and `declare module` in a global script can shadow an existing module's real types).
export {};

// The app theme (theme.js) defines a custom "yellow" Button color, used throughout the
// (still JS) codebase. This augmentation tells MUI's types about it; no runtime effect.
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    yellow: true;
  }
}
