// This app's installed @mui/icons-material version (5.10.14, pinned in package.json)
// predates the EditCalendar icon, while admin-front's version (5.14.1) has it.
// packages/front-core/components/muiIcons.ts imports it unconditionally for both apps
// (pre-existing behavior, unchanged by the TS migration) — this app-local shim only
// satisfies the type checker here; it does not change what actually resolves at
// runtime, so the real, pre-existing cross-app version-mismatch bug still exists
// and should be fixed separately (e.g. by upgrading this app's @mui/icons-material).
declare module '@mui/icons-material/EditCalendar' {
  export { default } from '@mui/material/SvgIcon';
}
