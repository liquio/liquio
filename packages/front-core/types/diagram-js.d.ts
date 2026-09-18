// `diagram-js` ships no types and there is no @types package installed.
declare module 'diagram-js/lib/core' {
  const CoreModule: unknown;
  export default CoreModule;
}
