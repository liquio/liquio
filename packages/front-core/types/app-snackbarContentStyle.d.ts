// `variables/styles/snackbarContentStyle.jsx` doesn't exist anywhere in the
// repo — confirmed via a repo-wide search. `components/Snackbar/*` (the
// directory importing it) is itself dead code (no importers anywhere in
// either app), so this broken import was never actually reached at runtime.
declare module 'variables/styles/snackbarContentStyle.jsx' {
  const snackbarContentStyle: (theme: unknown) => Record<string, unknown>;
  export default snackbarContentStyle;
}
