// Augments vite/client's `declare module '*.svg'` (default export only) with the
// `ReactComponent` named export produced by this project's custom Vite transform
// (see each app's vite.config.mjs), which rewrites `import { ReactComponent as X }
// from './icon.svg'` into a component import via vite-plugin-svgr.
declare module '*.svg' {
  export const ReactComponent: import('react').ComponentType<import('react').SVGProps<SVGSVGElement>>;
}
