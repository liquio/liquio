export const detectImageType = (content) => {
  switch (content.charAt(0)) {
    case '/':
      return 'jpg';
    case 'i':
      return 'png';
    case 'R':
      return 'gif';
    case 'U':
      return 'webp';
    default:
      return 'jpg';
  }
};

export default (encoded) => {
  let result = null;
  if (typeof encoded !== 'string') {
    return result;
  }

  const mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

  if (mime && mime.length) {
    [, result] = mime;
  }

  return result;
};
