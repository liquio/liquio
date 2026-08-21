export const urlParams = (obj) =>
  Object.entries(obj)
    .map(([key, val]) => `${key}=${val}`)
    .join('&');

export const getUrlParams = (search) => {
  const hashes = search.slice(search.indexOf('?') + 1).split('&');
  return hashes.reduce((params, hash) => {
    const [key, val] = hash.split('=');
    return Object.assign(params, { [key]: decodeURIComponent(val) });
  }, {});
};
