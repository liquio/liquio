import diff from 'helpers/diff';

export const objectArrayUnique = (array, idPropertyName = null) =>
  array.filter((row, index, self) => {
    if (idPropertyName) {
      return (
        self.findIndex(
          ({ [idPropertyName]: id }) => id === row[idPropertyName],
        ) === index
      );
    }
    return self.findIndex((obj) => !diff(row, obj)) === index;
  });

export const uniqbyValue = (array) => {
  if (!array) return [];
  const seen = {};
  return array.filter((item) => {
    if (seen.hasOwnProperty(item.value)) return null;
    seen[item.value] = true;
    return item;
  });
};

export default (array) =>
  array.filter((value, index, self) => self.indexOf(value) === index);
