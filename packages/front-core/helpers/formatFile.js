export default (file, text) =>
  new Promise((resolve) => {
    if (file.size && file.type === 'application/octet-stream') {
      if (text.indexOf('PDF') > 0) {
        file = new Blob([file], { type: 'application/pdf' });
      }
      if (text.indexOf('text/html') > 0) {
        file = new Blob([file], { type: 'text/html' });
      }
    }
    return resolve(file);
  });
