declare module 'sanitize-html' {
  interface Attribs {
    [name: string]: string;
  }

  interface Tag {
    tagName: string;
    attribs: Attribs;
  }

  export interface IOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemesByTag?: Record<string, string[]>;
    allowedClasses?: Record<string, string[]>;
    selfClosing?: string[];
    allowVulnerableTags?: boolean;
    parseStyleAttributes?: boolean;
    transformTags?: Record<string, (tagName: string, attribs: Attribs) => Tag>;
  }

  function sanitizeHtml(dirty: string, options?: IOptions): string;

  export default sanitizeHtml;
}
