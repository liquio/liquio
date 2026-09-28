/* eslint-disable no-cond-assign */
import objectPath from 'object-path';

function arrayToObjectPath(path) {
  let match;
  while ((match = /\[(.+)\]/gi.exec(path))) {
    path = path.replace(match[0], (match.index ? '.' : '') + match[1]);
  }
  return path;
}

export default function normalizeErrors(errors, t) {
  const controlErrors = {};
  errors &&
    errors.map(({ dataPath, params, message }) => {
      let path = '';
      if (dataPath) {
        path += arrayToObjectPath(dataPath);
      }
      if (params && params.missingProperty) {
        path += '.' + params.missingProperty;
      }

      path = path.split('.').filter(Boolean).join('.');

      return objectPath.set(controlErrors, path, t(message));
    });
  return controlErrors;
}
