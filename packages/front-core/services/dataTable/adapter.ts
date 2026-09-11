import type { DataTableEndpoint } from 'services/dataTable/types';

interface AdapterProps {
  actions?: unknown;
  count?: number | null;
  page?: number | null;
  data?: unknown;
  rowsSelected?: unknown[];
  hiddenColumns?: string[];
  sort?: Record<string, unknown>;
  rowsPerPage?: number;
  filters?: Record<string, unknown>;
  presets?: unknown[];
}

export default ({ actions, count, page, data, rowsSelected, hiddenColumns, sort, rowsPerPage, filters = {}, presets }: AdapterProps, endPoint: DataTableEndpoint = { sourceName: '', dataURL: '' }) => {
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
    presets
  };
};
