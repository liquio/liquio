function noopFilter(_value: any, _path: string[]): boolean {
  return true;
}

function noopIterator(_value: any, _path: string[]): void {
  return;
}

export default function deepFind(obj: object | null = {}, filter = noopFilter, iterator = noopIterator, path: string[] = []): void {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newPath = path.concat(key);

    if (filter(value, newPath)) {
      iterator(value, newPath);
    }

    deepFind(value, filter, iterator, newPath);
  }
}
