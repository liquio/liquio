declare module 'json5' {
  interface JSON5 {
    parse(text: string): unknown;
    stringify(value: unknown, replacer?: null, space?: string | number): string;
  }

  const JSON5: JSON5;
  export default JSON5;
}
