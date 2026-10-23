import type { DataTableRowState } from 'services/dataTable/types';

export default (payload: unknown): Partial<DataTableRowState> => {
  const { meta } = payload as { meta?: { currentPage?: number; perPage?: number; total?: number } };
  const { currentPage, perPage, total } = meta || {};

  return {
    data: payload,
    page: currentPage,
    rowsPerPage: perPage,
    count: total
  };
};
