const multiplier = (order) => (order === 'asc' ? 1 : -1);

export default (sorts) => (a, b) => {
  const sortingKeys = Object.keys(sorts);

  for (let s = 0; s < sortingKeys.length; s++) {
    if (a[sortingKeys[s]] > b[sortingKeys[s]]) {
      return -1 * multiplier(sorts[sortingKeys[s]]);
    }

    if (a[sortingKeys[s]] < b[sortingKeys[s]]) {
      return 1 * multiplier(sorts[sortingKeys[s]]);
    }
  }

  return 0;
};
