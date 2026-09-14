export default (html = '') => {
  let header: string | undefined;
  let body: string | undefined;
  let footer: string | undefined;
  let parts: string | undefined;

  if (html) {
    [header, parts] = html.split('<body>');
    [body, footer] = (parts as string).split('</body>');
  }

  return {
    header,
    body,
    footer,
  };
};
