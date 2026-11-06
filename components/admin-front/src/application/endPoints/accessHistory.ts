import type { DataTableEndpoint } from 'core/services/dataTable/types';

export default {
  dataURL: 'access-history',
  sourceName: 'accessHistory',
  autoLoad: true,
  searchFilterField: 'search'
} satisfies DataTableEndpoint;
