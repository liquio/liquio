export const blobToTextEncoded = (encoding) => (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsText(blob, encoding);
    reader.onloadend = () => resolve(reader.result);
  });

export default blobToTextEncoded('utf-8');
