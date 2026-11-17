import PropByPathLib from 'prop-by-path';

import { hasUnsafePathSegment } from './document_data_keys';
import { InvalidParamsError } from './errors';

const isUnsafe = (path: unknown): boolean => typeof path === 'string' && hasUnsafePathSegment(path);
const rejectUnsafe = (path: unknown): void => {
  if (isUnsafe(path)) {
    throw new InvalidParamsError('Invalid property path.', { cause: [(path as string).slice(0, 64)] });
  }
};

/** prop-by-path with prototype segments refused: writes throw, reads return the default value. */
const PropByPath = {
  get: (object: any, path: string, defaultValue?: any): any => (isUnsafe(path) ? defaultValue : PropByPathLib.get(object, path, defaultValue)),
  set: (object: any, path: string, value: any): any => {
    rejectUnsafe(path);
    return PropByPathLib.set(object, path, value);
  },
  delete: (object: any, path: string): any => {
    rejectUnsafe(path);
    return PropByPathLib.delete(object, path);
  },
};

export default PropByPath;
