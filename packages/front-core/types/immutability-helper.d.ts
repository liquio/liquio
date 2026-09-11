// `immutability-helper` is only installed in admin-front's node_modules —
// this is admin-only tooling (the JsonSchema editor's snippet library) that
// cabinet-front never actually imports at runtime, but it lives in the
// shared `packages/front-core` and so still needs to resolve for every
// app's tsconfig. Scoped to the one command (`$splice`) actually used here.
declare module 'immutability-helper' {
  type ArraySpec<T> = {
    $splice?: ReadonlyArray<[number, number?] | [number, number, ...T[]]>;
  };

  function update<T>(object: T[], spec: ArraySpec<T>): T[];

  export default update;
}
