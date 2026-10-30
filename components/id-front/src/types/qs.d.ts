declare module 'qs' {
  interface ParseOptions {
    ignoreQueryPrefix?: boolean;
    [key: string]: unknown;
  }

  export function parse(str: string, options?: ParseOptions): Record<string, unknown>;

  const qs: { parse: typeof parse };
  export default qs;
}
