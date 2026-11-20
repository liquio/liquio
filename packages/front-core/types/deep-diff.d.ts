declare module 'deep-diff' {
  export interface Diff {
    kind: 'N' | 'D' | 'E' | 'A';
    path?: Array<string | number>;
    lhs?: unknown;
    rhs?: unknown;
    index?: number;
    item?: Diff;
  }

  function diff(left: unknown, right: unknown): Diff[] | undefined;

  namespace diff {
    function applyChange(target: unknown, source: unknown, change: Diff): void;
  }

  export default diff;
}
