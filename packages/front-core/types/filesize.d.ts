// `filesize@^6.4.0` is declared in package.json but is genuinely absent from
// both apps' installed node_modules (confirmed: no resolved entry in either
// package-lock.json). Scoped to the default string-output usage in this repo.
declare module 'filesize' {
  export default function filesize(bytes: number, options?: Record<string, unknown>): string;
}
