export function pathToFileURL(value = '') {
  return new URL(String(value), window.location.href);
}

export function fileURLToPath(value = '') {
  return String(value).replace(/^file:\/\//, '');
}

export default {
  fileURLToPath,
  pathToFileURL
};
