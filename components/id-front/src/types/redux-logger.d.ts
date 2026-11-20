// `redux-logger` ships no types. Only `createLogger` with the `collapsed` option is used.
declare module 'redux-logger' {
  import type { Middleware } from 'redux';

  interface LoggerOptions {
    collapsed?: boolean;
    [key: string]: unknown;
  }

  export function createLogger(options?: LoggerOptions): Middleware;
}
