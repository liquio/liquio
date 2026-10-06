interface SchemaError {
  dataPath?: string;
  params?: { missingProperty?: string };
  path?: string;
  [key: string]: unknown;
}

function arrayToObjectPath(path: string): string {
  let match: RegExpExecArray | null;
  const regex = /\[(\d+)\]/g;
  while ((match = regex.exec(path))) {
    path = path.replace(match[0], '.' + match[1]);
  }
  return path;
}

export default (errors: Record<string, SchemaError> | SchemaError[] | undefined | null): SchemaError[] =>
  Object.values(errors || {}).map((error) => {
    let path = '';

    if (error.dataPath) {
      path += arrayToObjectPath(error.dataPath);
    }

    if (error.params && error.params.missingProperty) {
      path += '.' + error.params.missingProperty;
    }

    error.path = path.split('.').filter(Boolean).join('.');

    return error;
  });
