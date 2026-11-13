const readFileAsync = (file: Blob): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    const onReaderLoad = (event: ProgressEvent<FileReader>) => {
      try {
        const obj = JSON.parse(event.target?.result as string);
        resolve(obj);
      } catch (error) {
        resolve(error);
      }
    };

    reader.onload = onReaderLoad;

    reader.onerror = reject;

    reader.readAsText(file);
  });

export default (file: Blob, callback: (obj: unknown) => void): void => {
  const reader = new FileReader();

  const onReaderLoad = (event: ProgressEvent<FileReader>) => {
    const obj = JSON.parse(event.target?.result as string);
    callback(obj);
  };

  reader.onload = onReaderLoad;
  reader.readAsText(file);
};

export { readFileAsync };
