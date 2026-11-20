import objectPath from 'object-path';

/** The subset of an ajv validation error that is read here. */
export interface ValidationError {
  dataPath?: string;
  params?: { missingProperty?: string };
  message: string;
}

function arrayToObjectPath(path: string): string {
  let match;
  while ((match = /\[(.+)\]/gi.exec(path))) {
    path = path.replace(match[0], (match.index ? '.' : '') + match[1]);
  }
  return path;
}

export default function normalizeErrors(
  errors: ReadonlyArray<ValidationError> | null | undefined,
  t: (message: string) => string,
): Record<string, unknown> {
  const controlErrors: Record<string, unknown> = {};
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
