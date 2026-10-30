declare module 'sanitize-html' {
  export interface IOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemesByTag?: Record<string, string[]>;
    selfClosing?: string[];
  }

  function sanitizeHtml(dirty: string, options?: IOptions): string;

  export default sanitizeHtml;
}
