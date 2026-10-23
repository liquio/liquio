type NestedArray<T> = Array<T | NestedArray<T>>;

const flatten = <T>(arr: NestedArray<T>): T[] =>
  arr.reduce<T[]>(
    (flat, toFlatten) => flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten),
    []
  );

export default flatten;
