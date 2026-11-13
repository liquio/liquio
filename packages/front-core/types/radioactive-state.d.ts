declare module 'radioactive-state' {
  // Returns a Proxy of the same shape as the input; mutating any property (including nested
  // ones) schedules a re-render. The real library also exposes special `$`/`$fieldName`
  // properties (mutation count / input binding) via its Proxy `get` trap, but nothing in this
  // codebase reads them, so they're intentionally left out of this declaration.
  function useRS<T extends object>(initialState: T): T;

  export default useRS;
}
