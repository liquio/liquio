declare module 'clean-deep' {
  export interface CleanOptions {
    cleanKeys?: string[];
    cleanValues?: string[];
    emptyArrays?: boolean;
    emptyObjects?: boolean;
    emptyStrings?: boolean;
    NaNValues?: boolean;
    nullValues?: boolean;
    undefinedValues?: boolean;
  }

  function cleanDeep<T>(object: T, options?: CleanOptions): Partial<T>;

  export default cleanDeep;
}
