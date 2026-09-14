export default (file: File | Blob, text: string): Promise<File | Blob> =>
  new Promise((resolve) => {
    if ('size' in file && file.size && (file as File).type === 'application/octet-stream') {
      if (text.indexOf('PDF') > 0) {
        file = new Blob([file], { type: 'application/pdf' });
      }
      if (text.indexOf('text/html') > 0) {
        file = new Blob([file], { type: 'text/html' });
      }
    }
    return resolve(file);
  });
