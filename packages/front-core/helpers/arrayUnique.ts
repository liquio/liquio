import diff from 'helpers/diff';

export const objectArrayUnique = <T extends Record<string, unknown>>(
  array: T[],
  idPropertyName: string | null = null
): T[] =>
  array.filter((row, index, self) => {
    if (idPropertyName) {
      return self.findIndex((item) => item[idPropertyName] === row[idPropertyName]) === index;
    }
    return self.findIndex((obj) => !diff(row, obj)) === index;
  });

export const uniqbyValue = <T extends { value: unknown }>(array: T[] | null | undefined): T[] => {
  if (!array) return [];
  const seen: Record<string, boolean> = {};
  return array.filter((item) => {
    const key = String(item.value);
    if (Object.prototype.hasOwnProperty.call(seen, key)) return false;
    seen[key] = true;
    return true;
  });
};

export default <T>(array: T[]): T[] => array.filter((value, index, self) => self.indexOf(value) === index);
