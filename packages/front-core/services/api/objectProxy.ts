export default function objectProxy<T>(data: T, options: Record<string, unknown>): T {
  return typeof data === 'object' && data
    ? (new Proxy(data as object, {
        get(target, name, receiver) {
          return options[name as string] || Reflect.get(target, name, receiver);
        },
      }) as T)
    : data;
}
