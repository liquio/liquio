export default (file, format, text) =>
  new Promise((resolve) => {
    const { URL } = window;
    let url = file ? URL.createObjectURL(file) : '';
    if (format === 'html') {
      url = `data:text/html;charset=utf-8,${encodeURI(text)}`;
    }
    return resolve(url);
  });
