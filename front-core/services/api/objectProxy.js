export default (data, options) =>
  typeof data === 'object' && data
    ? new Proxy(data, {
        get(target, name, receiver) {
          return options[name] || Reflect.get(target, name, receiver);
        },
      })
    : data;
