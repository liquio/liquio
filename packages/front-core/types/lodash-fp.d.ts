declare module 'lodash/fp' {
  interface LodashFp {
    merge<T, U>(dest: T, source: U): T & U;
    // fp modules put the customizer first (auto-curried/rearg), unlike lodash's
    // regular `mergeWith(object, source, customizer)`.
    mergeWith<T, U>(
      customizer: (objValue: unknown, srcValue: unknown, key: string) => unknown,
      dest: T,
      source: U,
    ): T & U;
    cloneDeep<T>(value: T): T;
    equals(a: unknown, b: unknown): boolean;
    // Real lodash's `array` param is typed as an array, but this codebase's only call
    // site passes an object map — matches actual usage rather than the documented signature.
    difference(array: unknown, values: unknown): unknown[];
    uniq<T>(array: T[]): T[];
  }

  const _: LodashFp;
  export default _;
}
