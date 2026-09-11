const readFileAsync = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    const onReaderLoad = (event) => {
      try {
        const obj = JSON.parse(event.target.result);
        resolve(obj);
      } catch (error) {
        resolve(error);
      }
    };

    reader.onload = onReaderLoad;

    reader.onerror = reject;

    reader.readAsText(file);
  });

export default (file, callback) => {
  const reader = new FileReader();

  const onReaderLoad = (event) => {
    const obj = JSON.parse(event.target.result);
    callback(obj);
  };

  reader.onload = onReaderLoad;
  reader.readAsText(file);
};

export { readFileAsync };
