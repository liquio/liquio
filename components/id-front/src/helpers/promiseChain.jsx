export default (arr, params) => arr.reduce((acc, fn) => acc.then(fn), Promise.resolve(params));
