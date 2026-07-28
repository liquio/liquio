export default function ({ fileName, description, scanDocumentName }, attachBlob) {
  if (!attachBlob) return;

  const isIosSafari =
    /iP(ad|hone|od)/.test(navigator.userAgent) &&
    /WebKit/.test(navigator.userAgent) &&
    !/CriOS/.test(navigator.userAgent);

  if (isIosSafari) {
    const base64Data = attachBlob.includes(',') ? attachBlob.split(',')[1] : attachBlob;

    const byteCharacters = atob(base64Data);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i += 512) {
      const slice = byteCharacters.slice(i, i + 512);
      const byteNumbers = new Array(slice.length);
      for (let j = 0; j < slice.length; j++) {
        byteNumbers[j] = slice.charCodeAt(j);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }

    const blob = new Blob(byteArrays, { type: 'application/octet-stream' });
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);

    return;
  }

  let url = attachBlob;

  if (
    (typeof url === 'string' && !url.indexOf('data:') === 0) ||
    attachBlob instanceof Blob
  ) {
    url = URL.createObjectURL(attachBlob);
  }

  const element = document.createElement('a');
  element.setAttribute('href', url);
  element.setAttribute('download', fileName || description || scanDocumentName);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  //document.body.removeChild(element);
}
