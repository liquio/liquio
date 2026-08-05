const attrCharsetVariants = ['Charset=', 'CHARSET=', 'charset='];

export default (text) => {
  let charset = '';
  attrCharsetVariants.forEach((name) => {
    const charsetIndex = text.indexOf(name);
    if (charsetIndex > 0) {
      charset = text.substring(charsetIndex + name.length);
    }
  });
  charset = charset.slice(
    0,
    Math.min(charset.indexOf(' '), charset.indexOf('"')),
  );
  const type = text.indexOf('text/html') > 0 ? 'text/html' : 'plain/text';
  return new Blob([text], {
    type: `${type}${charset ? `;charset=${charset}` : ''}`,
  });
};
