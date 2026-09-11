export default (file: File | Blob | null | undefined, format: string | undefined, text: string): Promise<string> =>
  new Promise((resolve) => {
    const { URL } = window;
    let url = file ? URL.createObjectURL(file) : '';
    if (format === 'html') {
      url = `data:text/html;charset=utf-8,${encodeURI(text)}`;
    }
    return resolve(url);
  });
