import type { ReactNode } from 'react';
import sanitizeHtml, { IOptions } from 'sanitize-html';
import renderHTML from 'react-render-html';

const allowedAttributes = [
  'style',
  'class',
  'id',
  'width',
  'height',
  'colspan',
  'rowspan',
  'cellpadding',
  'cellspacing',
  'role',
  'aria-label',
  'tabIndex',
  'title',
  'onclick'
];
const allowedTags = [
  'b',
  'i',
  'em',
  'strong',
  'a',
  'div',
  'p',
  'span',
  'img',
  'pre',
  'code',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'table',
  'tbody',
  'td',
  'tr',
  'svg',
  'style',
  'br',
  'blockquote',
  'button',
  'sup',
  'th',
  'colgroup',
  'col',
  'mark',
  'details',
  'summary',
  'iframe'
];

const options: IOptions = {
  allowedTags,
  allowedAttributes: {},
  allowedSchemesByTag: {
    img: ['data', 'http', 'https']
  },
  selfClosing: ['img', 'br', 'hr'],
  allowVulnerableTags: true,
  parseStyleAttributes: false,
  transformTags: {}
};

interface RenderHtmlParams {
  disableTabIndex?: boolean;
}

const renderHtml = (str: string, params?: RenderHtmlParams): ReactNode => {
  allowedTags.forEach((tag) => {
    (options.allowedAttributes as Record<string, string[]>)[tag] =
      tag === 'a'
        ? ['href', 'target', 'download', ...allowedAttributes]
        : tag === 'img'
          ? ['src', 'alt', 'align', ...allowedAttributes]
          : [...allowedAttributes];

    (options.transformTags as Record<string, (tagName: string, attribs: Record<string, string>) => { tagName: string; attribs: Record<string, string> }>)[tag] = (tagName, attribs) => {
      const baseTags = ['div', 'img', 'style'];
      if (params?.disableTabIndex) {
        baseTags.push('p');
      }
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(!baseTags.includes(tag) ? { tabIndex: (attribs.tabIndex || attribs.tabindex) ?? '0' } : {})
        }
      };
    };
  });
  return renderHTML(sanitizeHtml(str || '', options));
};

export default renderHtml;
