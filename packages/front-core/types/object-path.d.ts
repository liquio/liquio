declare module 'object-path' {
  type Path = string | Array<string | number>;

  interface ObjectPath {
    get<T = unknown>(obj: unknown, path: Path, defaultValue?: T): T;
    set<T>(obj: T, path: Path, value: unknown, doNotReplace?: boolean): T;
    has(obj: unknown, path: Path): boolean;
    del<T>(obj: T, path: Path): T;
    ensureExists<T>(obj: T, path: Path, value: unknown): unknown;
  }

  const objectPath: ObjectPath;
  export default objectPath;
}
