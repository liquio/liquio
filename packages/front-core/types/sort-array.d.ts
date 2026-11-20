declare module 'sort-array' {
  interface SortArrayOptions {
    by?: string | string[];
    order?: string | unknown[];
    [key: string]: unknown;
  }

  function sortArray<T = unknown>(array: T[], options: SortArrayOptions): T[];

  export default sortArray;
}
