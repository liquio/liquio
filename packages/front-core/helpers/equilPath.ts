export default (arr1: unknown[] | null | undefined, arr2: unknown[] | null | undefined): boolean =>
  (arr1 && arr1.join('.')) === (arr2 && arr2.join('.'));
