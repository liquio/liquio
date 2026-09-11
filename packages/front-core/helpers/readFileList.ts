export function readAsBinary(file: Blob): Promise<string | ArrayBuffer | null> {
  const reader = new FileReader();
  reader.readAsBinaryString(file);

  return new Promise((resolve, reject) => {
    reader.addEventListener('load', () => resolve(reader.result));
    reader.onerror = (e) => reject(e);
  });
}

export const readAsBase64 = (file: Blob): Promise<string | ArrayBuffer | null> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

export function readAsUint8Array(file: Blob): Promise<Uint8Array> {
  const reader = new FileReader();
  reader.readAsArrayBuffer(file);

  return new Promise((resolve, reject) => {
    reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
  });
}

function readFile(file: Blob): Promise<string | ArrayBuffer | null> {
  return window.Promise.all([readAsBinary(file)]).then(([data]) => data);
}

export default function readFileList(fileList: ArrayLike<Blob>): Promise<Array<string | ArrayBuffer | null>> {
  return window.Promise.all(Array.prototype.map.call(fileList, readFile) as Array<Promise<string | ArrayBuffer | null>>);
}

export function readAsDataUrl(file: Blob): Promise<string | ArrayBuffer | null> {
  const reader = new FileReader();
  reader.readAsDataURL(file);

  return new window.Promise((resolve, reject) => {
    reader.addEventListener('load', () => {
      resolve(reader.result);
    });

    reader.onerror = (e) => reject(e);
  });
}

export const base64ToFile = (base64String: string, fileName: string, mimeType: string): File => {
  const bstr = atob(base64String);
  let length = bstr.length;
  const u8arr = new Uint8Array(length);

  while (length--) {
    u8arr[length] = bstr.charCodeAt(length);
  }

  return new File([u8arr], fileName, { type: mimeType });
};
