import sanitizeHtml from 'sanitize-html';
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

const options = {
  allowedTags,
  allowedAttributes: {},
  allowedSchemesByTag: {
    img: ['data', 'http', 'https'],
  },
  selfClosing: ['img', 'br', 'hr'],
};

allowedTags.forEach((tag) => {
  if (tag === 'a') {
    options.allowedAttributes[tag] = ['href', 'target', 'download', ...allowedAttributes];
  } else if (tag === 'img') {
    options.allowedAttributes[tag] = ['src', 'alt', 'align', ...allowedAttributes];
  } else {
    options.allowedAttributes[tag] = allowedAttributes;
  }
});

export default (str) => renderHTML(sanitizeHtml(str || '', options));
