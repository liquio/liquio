declare module 'object-path' {
  type Path = string | Array<string | number>;

  interface ObjectPath {
    set<T>(obj: T, path: Path, value: unknown, doNotReplace?: boolean): T;
  }

  const objectPath: ObjectPath;
  export default objectPath;
}
