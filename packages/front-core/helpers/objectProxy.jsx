const ObjectProxy = (data) =>
  new Proxy(data, {
    get(target, name) {
      switch (typeof target[name]) {
        case 'undefined':
          return ObjectProxy({});
        case 'number':
        case 'boolean':
        case 'string':
          return target[name];
        default:
          return ObjectProxy(target[name]);
      }
    },
  });

export default ObjectProxy;
