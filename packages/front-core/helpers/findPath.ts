/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */

const findPath = (ob: unknown, key: string): string => {
  const path: string[] = [];
  const keyExists = (obj: unknown): boolean => {
    if (!obj || (typeof obj !== 'object' && !Array.isArray(obj))) {
      return false;
    }
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return true;
    }
    if (Array.isArray(obj)) {
      const parentKey = path.length ? path.pop() : '';

      for (let i = 0; i < obj.length; i++) {
        path.push(`${parentKey}[${i}]`);
        const result = keyExists(obj[i]);
        if (result) {
          return result;
        }
        path.pop();
      }
    } else {
      for (const k in obj as Record<string, unknown>) {
        path.push(k);
        const result = keyExists((obj as Record<string, unknown>)[k]);
        if (result) {
          return result;
        }
        path.pop();
      }
    }
    return false;
  };

  keyExists(ob);

  return path.join('.');
};

export default findPath;
