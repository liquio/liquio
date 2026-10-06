// `isomorphic-fetch` ships no types; its default export is the platform `fetch`.
declare module 'isomorphic-fetch' {
  const fetch: typeof globalThis.fetch;
  export default fetch;
}
