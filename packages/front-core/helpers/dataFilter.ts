export default (filters: Record<string, unknown>) => (row: Record<string, unknown>): boolean =>
  Object.keys(filters)
    .map((filterName) => row[filterName] === filters[filterName])
    .every(Boolean);
