function arrayToObjectPath(path) {
  let match;
  const regex = /\[(\d+)\]/g;
  while ((match = regex.exec(path))) {
    path = path.replace(match[0], '.' + match[1]);
  }
  return path;
}

export default (errors) =>
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
