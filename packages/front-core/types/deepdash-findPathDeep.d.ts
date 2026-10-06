declare module 'deepdash/findPathDeep' {
  function findPathDeep(
    obj: unknown,
    callback: (value: unknown, key: string | number, parentValue: unknown, context: unknown) => boolean,
    options?: { pathFormat?: 'string' | 'array' }
  ): string | undefined;

  export default findPathDeep;
}
