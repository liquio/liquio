export default (filters) => (row) =>
  Object.keys(filters)
    .map((filterName) => row[filterName] === filters[filterName])
    .every(Boolean);
