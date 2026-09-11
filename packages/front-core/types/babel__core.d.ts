declare module '@babel/core' {
  interface BabelFileResult {
    code?: string | null;
  }

  export function transformSync(code: string, options?: unknown): BabelFileResult | null;
  export function transformAsync(code: string, options?: unknown): Promise<BabelFileResult | null>;
}
