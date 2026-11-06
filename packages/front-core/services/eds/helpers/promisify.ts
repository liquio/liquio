type NodeStyleFunc = (...args: unknown[]) => void;

export default (func: NodeStyleFunc) => (args?: unknown[]) =>
  new Promise((resolve, reject) => func(...(args || []), resolve, reject));
