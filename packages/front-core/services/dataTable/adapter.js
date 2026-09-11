export default (
  {
    actions,
    count,
    page,
    data,
    rowsSelected,
    hiddenColumns,
    sort,
    rowsPerPage,
    filters = {},
    presets,
  },
  endPoint = {},
) => {
  const { searchFilterField = 'name' } = endPoint;
  const search = filters[searchFilterField];

  return {
    data,
    page,
    actions,
    rowsSelected,
    hiddenColumns,
    rowsPerPage,
    sort,
    count,
    search: search || '',
    filters: filters || {},
    presets,
  };
};
