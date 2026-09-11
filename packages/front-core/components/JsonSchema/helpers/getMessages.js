import objectPath from 'object-path';
import evaluate from 'helpers/evaluate';

export default ({ getMessage } = {}, path, { value, rootDocument }) => {
  if (!getMessage) {
    return [];
  }

  const [stepName] = path;

  return []
    .concat(getMessage)
    .map(({ show, ...rest }) => {
      if (
        evaluate(
          show,
          value,
          rootDocument.data[stepName],
          rootDocument.data,
          objectPath.get(rootDocument.data, path.slice(0, path.length - 1)),
        )
      ) {
        return rest;
      }
      return null;
    })
    .filter(Boolean);
};
