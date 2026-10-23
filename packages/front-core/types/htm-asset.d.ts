// Both apps' vite.config.mjs add `.htm` to `assetsInclude`, so importing one
// resolves to its built URL string, same as `*.svg`'s default export (vite/client
// doesn't declare `.htm` itself — only a fixed list of common asset extensions).
declare module '*.htm' {
  const url: string;
  export default url;
}
