/**
 * Types for `services/dataTable/*` and the per-app endpoint configs it consumes
 * (`src/application/endPoints/*`).
 */

// `page`/`rowsPerPage` allow `null` because `getDataUrl`/`composeUrl` are called directly
// with the reducer's own `DataTableRowState` (where `page` can be null before the first load),
// not just with fresh request params.
export interface DataTableRequestState<Filters = Record<string, unknown>> {
  page?: number | null;
  rowsPerPage?: number | null;
  filters: Filters;
  sort?: Record<string, unknown>;
  search?: string;
  rawFilters?: boolean;
}

export interface DataTableRowState {
  loading: boolean;
  error: string | null;
  count: number | null;
  page: number | null;
  rowsPerPage: number;
  data: unknown;
  rowsSelected: unknown[];
  hiddenColumns: string[];
  filters: Record<string, unknown>;
  presets: unknown[];
  search: string;
  sort: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DataTableAction {
  type: string;
  payload?: unknown;
  request?: unknown;
  [key: string]: unknown;
}

/**
 * A per-app data table endpoint config, passed to `services/dataTable`'s `useTable`,
 * `connect`/`connectWithOwnProps`, `actions`, and `reducer`. `Filters` narrows the shape
 * `getDataUrl`/`composeUrl`/`getQueryBody` destructure from `filters`; it's left as
 * `Record<string, unknown>` for endpoints whose filter shape isn't worth naming.
 *
 * `actions` entries are heterogeneous in practice: most are `(endPoint) => (...) => Action`
 * factories bound via `bindActionCreators`, but a few (e.g. `isRowSelectable`) are plain
 * per-row predicate factories called directly, never dispatched — so this stays `unknown`
 * rather than pretending there's one consistent call signature.
 */
export interface DataTableEndpoint<Filters = Record<string, unknown>> {
  sourceName: string;
  dataURL: string;
  method?: 'GET' | 'POST';
  autoLoad?: boolean;
  sticky?: boolean;
  staticData?: boolean;
  timeout?: number;
  rawFilters?: boolean;
  searchFilterField?: string;
  startPage?: number;
  requestData?: unknown;
  getQueryBody?: (tableState: DataTableRequestState<Filters>) => unknown;
  getDataUrl?: (dataURL: string, tableState: DataTableRequestState<Filters>, useQueryParams?: boolean) => string;
  composeUrl?: (dataURL: string, tableState: DataTableRequestState<Filters>, useQueryParams?: boolean) => string;
  mapData?: (payload: unknown, state: Partial<DataTableRowState>) => Partial<DataTableRowState>;
  reduce?: (state: DataTableRowState, action: DataTableAction) => DataTableRowState;
  defaultOptions?: Partial<DataTableRowState>;
  actions?: Record<string, unknown>;
  fetchFuncProp?: (state: Partial<DataTableRowState>) => Promise<unknown>;
  [key: string]: unknown;
}
