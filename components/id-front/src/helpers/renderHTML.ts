import sanitizeHtml from 'sanitize-html';
import type { IOptions } from 'sanitize-html';
import type { ReactNode } from 'react';
import renderHTML from 'react-render-html';

const allowedAttributes = ['style', 'class', 'id', 'width', 'height'];
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
];

const tagAttributes: Record<string, string[]> = {};

const options: IOptions = {
  allowedTags,
  allowedAttributes: tagAttributes,
  allowedSchemesByTag: {
    img: ['data', 'http', 'https'],
  },
  selfClosing: ['img', 'br', 'hr'],
};

allowedTags.forEach((tag) => {
  if (tag === 'a') {
    tagAttributes[tag] = ['href', 'target', 'download', ...allowedAttributes];
  } else if (tag === 'img') {
    tagAttributes[tag] = ['src', 'alt', 'align', ...allowedAttributes];
  } else {
    tagAttributes[tag] = allowedAttributes;
  }
});

export default (str?: string | null): ReactNode => renderHTML(sanitizeHtml(str || '', options));
