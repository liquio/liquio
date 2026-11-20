declare module 'mustache' {
  // A parsed mustache token: [type, value, start, end, ...nested tokens for sections].
  type MustacheToken = [string, string, number, number, ...unknown[]];

  const Mustache: {
    parse: (template: string, tags?: [string, string]) => MustacheToken[];
  };
  export default Mustache;
}
