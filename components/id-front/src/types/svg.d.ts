// CRA-style named import, rewritten to `?react` by the cra-svg-imports plugin in vite.config.mjs.
declare module '*.svg' {
  import type { FunctionComponent, SVGProps } from 'react';

  export const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}
