export const minifyHtml = (html) => {
  const minifiedHtml = html
    .replace(/\s+/g, ' ') // Remove extra whitespace
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/(\r\n|\n|\r)/gm, ''); // Remove new lines

  return minifiedHtml;
};
