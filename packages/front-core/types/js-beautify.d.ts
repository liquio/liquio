// `js-beautify` ships no types and there is no @types package installed.
// Scoped to the default (JS) beautifier and the `html` sub-formatter, the
// only two entry points used in this repo.
declare module 'js-beautify' {
  interface BeautifyOptions {
    indent_size?: number;
    preserve_newlines?: boolean;
    indent_handlebars?: boolean;
    wrap_line_length?: number;
    [key: string]: unknown;
  }

  function beautify(code: string, options?: BeautifyOptions): string;

  export function html(code: string, options?: BeautifyOptions): string;
  export default beautify;
}
