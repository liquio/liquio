/**
 * Helper for reading file as binary string
 * @param {object} file - uploaded file instance
 */
export function readAsBinary(file) {
  const reader = new FileReader();
  reader.readAsBinaryString(file);

  return new Promise((resolve, reject) => {
    reader.addEventListener('load', () => resolve(reader.result));
    reader.onerror = (e) => reject(e);
  });
}

export const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

export function readAsUint8Array(file) {
  const reader = new FileReader();
  reader.readAsArrayBuffer(file);

  return new Promise((resolve, reject) => {
    reader.onloadend = ({ target: { result } }) =>
      resolve(new Uint8Array(result));
    reader.onerror = reject;
  });
}

/**
 * Helper for read file
 * @param {object} file - uploaded file instance
 */
function readFile(file) {
  return window.Promise.all([readAsBinary(file)]).then(([data]) => data);
}

/**
 * Helper for reading file list
 * @param {object} fileList - list of files
 */
export default function readFileList(fileList) {
  return window.Promise.all(Array.prototype.map.call(fileList, readFile));
}

/**
 * Helper for reading file as data url (base64)
 * @param {object} file - uploaded file instance
 */
export function readAsDataUrl(file) {
  const reader = new FileReader();
  reader.readAsDataURL(file);

  return new window.Promise((resolve, reject) => {
    reader.addEventListener('load', () => {
      resolve(reader.result);
    });

    reader.onerror = (e) => reject(e);
  });
}

export const base64ToFile = (base64String, fileName, mimeType) => {
  const bstr = atob(base64String);
  let length = bstr.length;
  const u8arr = new Uint8Array(length);

  while (length--) {
    u8arr[length] = bstr.charCodeAt(length);
  }

  return new File([u8arr], fileName, { type: mimeType });
};
