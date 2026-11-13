// vite.config's `assetsInclude: ['**/*.xml']` makes Vite treat `.xml`
// imports as static assets, resolving to a URL string at build time.
declare module '*.xml' {
  const url: string;
  export default url;
}
