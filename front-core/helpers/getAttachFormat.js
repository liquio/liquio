export default (file, text = '') => {
  const { type } = file || {};
  if (!type) return 'text';
  if (type.indexOf('image') === 0) return 'image';
  switch (type) {
    case 'application/pdf':
      return 'pdf';
    case 'video/mp4':
    case 'video/webm':
    case 'video/ogg':
      return 'video';
    case 'audio/mp3':
    case 'audio/mpeg':
    case 'audio/wav':
    case 'audio/ogg':
      return 'audio';
    case 'application/octet-stream':
      if (file.size && text.indexOf('PDF') > 0) {
        return 'pdf';
      }
      return 'binary';
    case 'application/msword':
    case 'officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'rtf':
    case 'application/rtf':
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'googleViewDoc';
    case 'text/html':
    case 'html':
    case 'text/xml':
    case 'text/xhtml':
    case 'text/XHTML':
    case 'XHTML':
    case 'xhtml':
    case 'xml':
      return 'html';
    default:
      return 'unknown';
  }
};
