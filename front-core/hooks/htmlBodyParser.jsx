export default (html = '') => {
  let header;
  let body;
  let footer;
  let parts;

  if (html) {
    [header, parts] = html.split('<body>');
    [body, footer] = parts.split('</body>');
  }

  return {
    header,
    body,
    footer,
  };
};
