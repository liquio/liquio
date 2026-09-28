declare module 'qs' {
  interface StringifyOptions {
    // Real qs only documents 'indices' | 'brackets' | 'repeat' | 'comma', but this codebase's
    // call sites also pass 'index' (silently falling back to default behavior) — kept loose
    // rather than "fixed", to match actual usage instead of the library's documented enum.
    arrayFormat?: string;
    delimiter?: string;
    encode?: boolean;
    skipNulls?: boolean;
    addQueryPrefix?: boolean;
    [key: string]: unknown;
  }

  interface ParseOptions {
    arrayLimit?: number;
    depth?: number;
    delimiter?: string;
    [key: string]: unknown;
  }

  export function stringify(obj: unknown, options?: StringifyOptions): string;
  export function parse(str: string, options?: ParseOptions): Record<string, unknown>;
}
