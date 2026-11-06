export default <T>(arr: Array<(value: T) => T | Promise<T>>, params?: T): Promise<T> =>
  arr.reduce<Promise<T>>((acc, fn) => acc.then(fn), Promise.resolve(params as T));
