declare module 'mime-types' {
  export function extension(type: string | null | undefined): string | false;
  export function lookup(pathOrExtension: string): string | false;
}
