declare module 'lodash' {
  export function get(object: unknown, path: string | Array<string | number>, defaultValue?: unknown): unknown;
  export function merge<T, U>(dest: T, source: U): T & U;
  export function omit<T extends object>(object: T, paths: string[]): Partial<T>;
  export function pick<T extends object>(object: T, paths: string[]): Partial<T>;
  export function uniqueId(prefix?: string): string;
  export function filter<T>(collection: T[] | null | undefined, predicate: (value: T) => boolean): T[];
  export function head<T>(array: T[] | null | undefined): T | undefined;
  export function includes(collection: unknown, value: unknown): boolean;
  export function reduce<T, R>(collection: T[] | null | undefined, iteratee: (accumulator: R, value: T) => R, accumulator: R): R;
  export function reduce<R>(collection: string, iteratee: (accumulator: R, value: string) => R, accumulator: R): R;
  export function startsWith(str: string | null | undefined, target: string): boolean;
  export function tail<T>(array: T[] | null | undefined): T[];
}
