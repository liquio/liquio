type ProxyValue = unknown;

const ObjectProxy = (data: Record<string, ProxyValue>): Record<string, ProxyValue> =>
  new Proxy(data, {
    get(target, name: string) {
      switch (typeof target[name]) {
        case 'undefined':
          return ObjectProxy({});
        case 'number':
        case 'boolean':
        case 'string':
          return target[name];
        default:
          return ObjectProxy(target[name] as Record<string, ProxyValue>);
      }
    }
  });

export default ObjectProxy;
