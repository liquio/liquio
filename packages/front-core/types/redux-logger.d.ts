// `redux-logger` ships no types and there is no @types package installed.
declare module 'redux-logger' {
  import { Middleware } from 'redux';

  interface LoggerOptions {
    collapsed?: boolean;
    [key: string]: unknown;
  }

  export function createLogger(options?: LoggerOptions): Middleware;
}
