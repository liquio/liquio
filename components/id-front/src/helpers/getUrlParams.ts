export const urlParams = (obj: Record<string, unknown>): string =>
  Object.entries(obj)
    .map(([key, val]) => `${key}=${val}`)
    .join('&');

export const getUrlParams = (search: string): Record<string, string> => {
  const hashes = search.slice(search.indexOf('?') + 1).split('&');
  return hashes.reduce<Record<string, string>>((params, hash) => {
    const [key, val] = hash.split('=');
    // A pair without "=" has val === undefined, which decodes to the string "undefined"; preserved.
    return Object.assign(params, { [key]: decodeURIComponent(val) });
  }, {});
};
