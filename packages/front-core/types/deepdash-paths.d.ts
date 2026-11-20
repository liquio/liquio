// `deepdash`'s package.json only ships a "types" field for its main entry;
// this deep subpath import has no adjacent .d.ts.
declare module 'deepdash/paths' {
  export default function paths(obj: unknown): string[];
}
