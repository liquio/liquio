/**
 * Memory cache object.
 */
export default function memoryCache() {
  const cache = {};
  return {
    get: (key) => {
      return (cache[key]);
    },
    set: (key, value) => {
      cache[key] = value;
    },
    setTime: (key) => {
      cache['time'] = {
        [key]: +new Date()
      };
    },
    getTime: (key) => {
      return cache['time'] && cache['time'][key] ? cache['time'][key] : undefined;
    }
  };
}
