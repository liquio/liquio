// `promise-timeout` ships no types and there is no @types package installed.
declare module 'promise-timeout' {
  export function timeout<T>(promise: Promise<T>, timeoutMillis: number): Promise<T>;
  export class TimeoutError extends Error {}
}
