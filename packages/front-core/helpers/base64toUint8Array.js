const BASE64_MARKER = ';base64,';

export default function base64toUint8Array(dataURI) {
  let base64 = dataURI;

  if (dataURI.indexOf(BASE64_MARKER) >= 0) {
    const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    base64 = dataURI.substring(base64Index);
  }

  const raw = window.atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}
