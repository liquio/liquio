// `save-svg-as-png` ships no types and no @types package is installed.
// Scoped to the one usage in WorkflowSettings/index.tsx.
declare module 'save-svg-as-png' {
  interface SaveSvgAsPngOptions {
    backgroundColor?: string;
    width?: number | string;
    height?: number | string;
    left?: number | string;
    top?: number | string;
    [key: string]: unknown;
  }

  export function saveSvgAsPng(
    svg: SVGElement,
    filename: string,
    options?: SaveSvgAsPngOptions,
  ): void;
}
