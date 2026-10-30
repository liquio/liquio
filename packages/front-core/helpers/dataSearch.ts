export default <T extends Record<string, unknown>>(search: string, data: T[]): T[] => {
  if (!search || !data || !data.length) {
    return data;
  }

  return data.filter((item) => {
    const keys = Object.keys(item);
    const matches = keys.filter((key) => {
      const index = String(item[key]).toLocaleLowerCase().indexOf(search.toLocaleLowerCase());
      return index >= 0;
    });

    return !!matches.length;
  });
};
