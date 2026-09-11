export default (payload) => {
  const { meta } = payload;
  const { currentPage, perPage, total } = meta || {};

  return {
    data: payload,
    page: currentPage,
    rowsPerPage: perPage,
    count: total,
  };
};
