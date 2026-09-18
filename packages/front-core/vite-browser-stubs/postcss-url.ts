export function pathToFileURL(value: string | URL = ''): URL {
  return new URL(String(value), window.location.href);
}

export function fileURLToPath(value: string | URL = ''): string {
  return String(value).replace(/^file:\/\//, '');
}

export default {
  fileURLToPath,
  pathToFileURL
};
