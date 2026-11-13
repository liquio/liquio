declare module 'lodash/fp' {
  interface LodashFp {
    // lodash/fp's merge is immutable: it returns a new object and leaves both arguments alone.
    merge<T, U>(dest: T, source: U): T & U;
  }

  const _: LodashFp;
  export default _;
}
