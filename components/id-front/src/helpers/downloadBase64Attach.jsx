export default function ({ fileName, description, scanDocumentName }, blob) {
  const { document, URL } = window;

  const element = document.createElement('a');
  element.setAttribute('href', URL.createObjectURL(blob));
  element.setAttribute('download', fileName || description || scanDocumentName);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
