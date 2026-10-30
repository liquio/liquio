export default function getUrlParams(search: string): Record<string, string> {
  const hashes = search.slice(search.indexOf('?') + 1).split('&');
  return hashes.reduce<Record<string, string>>((params, hash) => {
    const [key, val] = hash.split('=');
    return Object.assign(params, { [key]: decodeURIComponent(val) });
  }, {});
}
