import React from 'react';
import classNames from 'classnames';
import MobileDetect from 'mobile-detect';
import { useTranslate } from 'react-translate';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import {
  Box,
  Checkbox,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import storage from 'helpers/storage';
import Toolbar from './components/Toolbar';
import CustomPagination from './components/Pagination';

const useStyles = makeStyles((theme: Theme) => ({
  highlightedRow: {
    backgroundColor: (theme as unknown as { dataTableHighlights?: string }).dataTableHighlights,
  },
  hidden: {
    opacity: 0,
  },
  clickableRow: {
    cursor: 'pointer',
  },
  selectedFilters: {
    width: '100%',
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  selectedFiltersClear: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  selectedFiltersItem: {
    maxWidth: '452px',
    border: `1px solid ${(theme as unknown as { borderColor?: string }).borderColor || theme?.palette?.divider}`,
    borderRadius: '28px',
    padding: '6px 12px',
    display: 'flex',
    '& div': {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    '& span': {
      paddingRight: 3,
    },
  },
  selectedFiltersLabel: {
    margin: 0,
    fontWeight: 700,
    fontSize: '14px',
    lineHeight: '20px',
  },
  toolbarFilters: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  toolbarActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 3,
    '& > *': {
      marginRight: theme.spacing(1),
    },
    [theme.breakpoints.down('md')]: {
      flexWrap: 'wrap' as const,
      gap: theme.spacing(1),
      width: '100%',
      '& > *': {
        marginRight: 0,
      },
      '& > .MuiInputBase-root': {
        flex: 1,
      },
    },
  },
  toolbarSettings: {
    display: 'flex',
    gap: 8,
  },
  toolbarQuickFilter: {
    backgroundColor:
      (theme as unknown as { toolbarQuickFilter?: { backgroundColor?: string } }).toolbarQuickFilter?.backgroundColor ||
      (theme as unknown as { leftSidebarBg?: string }).leftSidebarBg,
    borderRadius:
      (theme as unknown as { toolbarQuickFilter?: { borderRadius?: number } }).toolbarQuickFilter?.borderRadius || 40,
    padding: 0,
    minWidth: 320,
    '& fieldset': {
      transition: 'border-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
      borderColor: 'transparent',
    },
    '& .MuiInputBase-root': {
      height: 40,
      borderRadius:
        (theme as unknown as { toolbarQuickFilter?: { borderRadius?: number } }).toolbarQuickFilter?.borderRadius || 40,
      '&.Mui-focused': {
        '& fieldset': {
          border: (theme as unknown as { toolbarQuickFilter?: { borderActive?: string } }).toolbarQuickFilter
            ?.borderActive,
        },
      },
      '& fieldset': {
        border: (theme as unknown as { toolbarQuickFilter?: { border?: string } }).toolbarQuickFilter?.border || 'none',
      },
      '&:hover': {
        '& fieldset': {
          border:
            (theme as unknown as { toolbarQuickFilter?: { borderHover?: string } }).toolbarQuickFilter?.borderHover ||
            `2px solid ${theme?.palette?.primary?.main}`,
        },
      },
    },
    '& .Mui-focused fieldset': {
      border:
        (theme as unknown as { toolbarQuickFilter?: { borderFocus?: string; borderActive?: string } })
          .toolbarQuickFilter?.borderFocus ||
        (theme as unknown as { toolbarQuickFilter?: { borderFocus?: string; borderActive?: string } })
          .toolbarQuickFilter?.borderActive ||
        `2px solid ${theme?.palette?.primary?.main}`,
    },
    [theme.breakpoints.down('sm')]: {
      minWidth: 'unset',
      width: '100%',
    },
  },
  buttonSm: {
    [theme.breakpoints.down('sm')]: {
      ...((theme as unknown as { filtersButtonMobile?: Record<string, unknown> }).filtersButtonMobile || {}),
    },
  },
  columnOutline: {
    '& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell': {
      outline: 'none!important',
    },
  },
  withRowCount: {
    '& .MuiDataGrid-main': {
      flex: 'none',
    },
  },
  rowCount: {
    padding: '15px 10px',
    fontWeight: 400,
    fontSize: '16px',
    lineHeight: '24px',
    borderTop: `1px solid ${(theme as unknown as { borderColor?: string }).borderColor || theme?.palette?.divider}`,
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  clearAll: {
    color: theme?.palette?.error?.main,
    borderColor: theme?.palette?.error?.main,
    borderRadius: '28px',
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '20px',
    padding: '6px 12px',
    '&:hover': {
      borderColor: theme?.palette?.error?.main,
      backgroundColor: 'transparent',
    },
  },
  filterLabel: {
    color: theme?.palette?.text?.secondary,
    lineHeight: '20px',
  },
  closeBtn: {
    marginLeft: '11px',
    '& svg': {
      width: '10px',
      height: '10px',
      fill: theme?.palette?.error?.main,
    },
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  toolbarRoot: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  tableContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
  },
  tableWrapper: {
    flex: 1,
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  headCell: {
    height: 52,
    fontWeight: 600,
    backgroundColor: theme.palette.background.default,
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
    borderBottom: `1px solid ${(theme as unknown as { borderColor?: string }).borderColor || theme?.palette?.divider}`,
  },
  sortableHeadCell: {
    cursor: 'pointer',
    userSelect: 'none' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  sortIcon: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  checkboxCell: {
    width: 48,
    paddingLeft: 2,
    paddingRight: 2,
  },
  rowBase: {
    transition: 'background-color 0.2s ease',
    padding: '12px 16px',
  },
  rowDense: {
    '& td': {
      paddingTop: 4,
      paddingBottom: 4,
      height: 52,
    },
  },
  rowStandard: {
    '& td': {
      paddingTop: 4,
      paddingBottom: 4,
      height: 52,
    },
  },
  rowComfortable: {
    '& td': {
      paddingTop: 12,
      paddingBottom: 12,
      height: 52,
    },
  },
  noRowsCell: {
    padding: theme.spacing(4),
    textAlign: 'center' as const,
    color: theme.palette.text.secondary,
  },
  loadingBar: {
    position: 'sticky' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
}));

const COLUMN_WIDTHS_STORAGE_KEY = 'dataGrid.columnWidths';
const COLUMN_VISIBILITY_STORAGE_KEY = 'dataGrid.columnVisibility';

export type Row = Record<string, unknown>;

export interface RowParams {
  id: unknown;
  row: Row;
}

export interface CellParams {
  row: Row;
  field: string;
  value: unknown;
  id?: unknown;
}

export interface Column {
  field: string;
  headerName?: string;
  headerAlign?: string;
  align?: string;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  sortable?: boolean;
  renderHeader?: (column: Column) => React.ReactNode;
  renderCell?: (params: CellParams) => React.ReactNode;
  valueGetter?: (params: { row: Row; field: string; value: unknown }) => unknown;
  valueFormatter?: (params: { row: Row; field: string; value: unknown }) => React.ReactNode;
  [key: string]: unknown;
}

export interface Actions {
  isRowClickable?: (params: RowParams) => boolean;
  isRowSelectable?: (params: RowParams) => boolean;
  onRowsSelect?: (ids: unknown[]) => void;
  onChangePage?: (page: number) => void;
  onColumnSortChange?: (field: string, sort: string, resetPage: boolean, immediate: boolean) => void;
  onChangeRowsPerPage?: (size: number) => void;
  onSearchChange?: (value: string, immediate: boolean) => void;
  load?: () => void;
  [key: string]: unknown;
}

interface DataGridProps {
  rows?: Row[];
  columns?: Column[];
  highlight?: unknown[];
  loading?: boolean;
  onRowClick?: (params: RowParams, event: React.SyntheticEvent) => void;
  actions?: Actions;
  search?: string;
  rowsPerPage?: number;
  checkable?: boolean;
  controls?: Record<string, unknown>;
  count?: number;
  page?: number;
  sort?: Record<string, string>;
  keepNonExistentRowsSelected?: boolean;
  CustomToolbar?: React.ComponentType<Record<string, unknown>> | null;
  CustomBottomToolbar?: React.ComponentType<Record<string, unknown>> | null;
  filters?: Record<string, unknown> | unknown[];
  rowsSelected?: unknown[];
  filterHandlers?: Record<string, unknown> | null;
  startPage?: number | null;
  columnVisibilityModel?: Record<string, boolean>;
  pagination?: boolean;
  showRowCount?: boolean;
  getRowId?: ((row: Row) => unknown) | null;
  height?: string | number;
  onColumnVisibilityCallback?: (model: Record<string, boolean>) => void;
  hiddenMenu?: boolean;
  localeText?: { noRowsLabel?: string };
  selectedFilters?: { name: string; label?: string; value?: unknown }[];
  updateSelectedFilters?: (filters: unknown[], filter: unknown) => void;
  isMobile?: boolean;
  [key: string]: unknown;
}

const DataGrid = (props: DataGridProps) => {
  // React 19 dropped `defaultProps` support for function components, so the
  // defaults formerly declared via `DataGrid.defaultProps` are applied here
  // instead, via the destructuring assignment, to preserve exact behavior.
  const {
    rows = [],
    columns = [],
    highlight = [],
    loading = false,
    onRowClick = () => {},
    actions = {},
    search: searchProps = '',
    rowsPerPage: pageSize = 10,
    checkable = false,
    controls = {},
    count = 0,
    page = 1,
    sort = {},
    keepNonExistentRowsSelected = true,
    CustomToolbar = null,
    CustomBottomToolbar = null,
    filters = {},
    rowsSelected = [],
    filterHandlers = null,
    startPage = null,
    columnVisibilityModel: columnVisibilityModelProps = {},
    pagination = true,
    showRowCount = false,
    getRowId = null,
    height = '100%',
    onColumnVisibilityCallback = () => {},
    hiddenMenu = false,
    localeText = {},
    selectedFilters = [],
    updateSelectedFilters = () => {},
  } = props;

  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobileDevice =
      typeof props.isMobile === 'boolean' ? props.isMobile : !!md.mobile();
    return isMobileDevice;
  });
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [search, setSearch] = React.useState(searchProps);
  const [columnVisibilityModel, setColumnVisibilityModel] = React.useState<Record<string, boolean>>(
    () => ({
      ...JSON.parse(storage.getItem(COLUMN_VISIBILITY_STORAGE_KEY) || '{}'),
      ...columnVisibilityModelProps,
    }),
  );
  const [sortModel, setSortModel] = React.useState<{ field: string; sort: string }[]>(() =>
    Object.keys(sort || {}).map((field) => ({
      field,
      sort: (sort as Record<string, string>)[field],
    })),
  );
  const [columnWidths] = React.useState<Record<string, number | string>>(() => {
    return JSON.parse(storage.getItem(COLUMN_WIDTHS_STORAGE_KEY) || '{}');
  });
  const [density, setDensity] = React.useState('standard');

  const classes = useStyles();
  const t = useTranslate('Elements');

  const getRowIdentifier = React.useCallback(
    (row: Row) => {
      if (typeof getRowId === 'function') {
        return getRowId(row);
      }
      return row?.id;
    },
    [getRowId],
  );

  const createRowParams = React.useCallback(
    (row: Row): RowParams => ({
      id: getRowIdentifier(row),
      row,
    }),
    [getRowIdentifier],
  );

  const onCellKeyDown = React.useCallback(
    (row: Row, event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        const params = createRowParams(row);
        const canClick =
          !actions?.isRowClickable || actions.isRowClickable(params);
        if (canClick) {
          onRowClick && onRowClick(params, event);
        } else if (event) {
          event.stopPropagation?.();
          event.preventDefault?.();
        }
      }
    },
    [onRowClick, actions, createRowParams],
  );

  const memoizedOnChangePage = React.useCallback(actions.onChangePage as (page: number) => void, [
    actions.onChangePage,
  ]);

  const memoizedOnSortChange = React.useCallback(
    actions.onColumnSortChange as (
      field: string,
      sort: string,
      resetPage: boolean,
      immediate: boolean,
    ) => void,
    [actions.onColumnSortChange],
  );

  const memoizedOnChangePageSize = React.useCallback(
    actions.onChangeRowsPerPage as (size: number) => void,
    [actions.onChangeRowsPerPage],
  );

  const getRowClassName = React.useCallback(
    (row: Row) => {
      const params = createRowParams(row);
      // `onRowClick` always has a value now that its default (`() => {}`,
      // restored from the old `defaultProps`) applies again under React 19,
      // so this check is provably always true — same behavior as when
      // `defaultProps` last worked, just without the now-redundant guard.
      const clickable = !actions?.isRowClickable || actions.isRowClickable(params);
      const rowId = params.id;
      return classNames({
        [classes.highlightedRow]: rowId !== undefined && highlight.includes(rowId),
        [classes.clickableRow]: !!clickable,
      });
    },
    [highlight, onRowClick, classes, actions, createRowParams],
  );

  const handleRowClick = React.useCallback(
    (row: Row, event: React.SyntheticEvent) => {
      const params = createRowParams(row);
      if (actions?.isRowClickable && !actions.isRowClickable(params)) {
        (event as unknown as { stopPropagation?: () => void })?.stopPropagation?.();
        (event as unknown as { preventDefault?: () => void })?.preventDefault?.();
        return;
      }
      onRowClick && onRowClick(params, event);
    },
    [actions, onRowClick, createRowParams],
  );

  const handleSearch = React.useCallback(
    ({ target: { value } }: { target: { value: string } }) => {
      setSearch(value);

      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        actions.onSearchChange && actions.onSearchChange(value, true);
      }, 500);
    },
    [actions, setSearch],
  );

  const handleSortModelChange = React.useCallback((column: Column) => {
    if (column?.sortable === false) return;
    setSortModel((prev) => {
      if (prev.length && prev[0].field === column.field) {
        const nextDirection = prev[0].sort === 'asc' ? 'desc' : 'asc';
        return [{ field: column.field, sort: nextDirection }];
      }
      return [{ field: column.field, sort: 'asc' }];
    });
  }, []);

  const handleColumnVisibilityModelChange = React.useCallback(
    (field: string, isVisible: boolean) => {
      setColumnVisibilityModel((prev) => {
        const updated = { ...prev };
        if (isVisible) {
          delete updated[field];
        } else {
          updated[field] = false;
        }
        storage.setItem(
          COLUMN_VISIBILITY_STORAGE_KEY,
          JSON.stringify(updated),
        );
        onColumnVisibilityCallback && onColumnVisibilityCallback(updated);
        return updated;
      });
    },
    [onColumnVisibilityCallback],
  );

  React.useEffect(() => {
    if (columnVisibilityModelProps) {
      setColumnVisibilityModel({
        ...JSON.parse(storage.getItem(COLUMN_VISIBILITY_STORAGE_KEY) || '{}'),
        ...columnVisibilityModelProps,
      });
    }
  }, [columnVisibilityModelProps]);

  React.useEffect(() => {
    const current = sortModel[0];
    if (!current) {
      return;
    }
    if (sort && sort[current.field] !== current.sort) {
      memoizedOnSortChange &&
        memoizedOnSortChange(current.field, current.sort, true, true);
    }
  }, [sortModel, memoizedOnSortChange]);

  const renderRowCount = React.useCallback(() => {
    return (
      <div className={classes.rowCount}>
        {t('total')} {count}
      </div>
    );
  }, [classes, count, t]);

  const densityClasses = React.useMemo(
    () => ({
      compact: classes.rowDense,
      standard: classes.rowStandard,
      comfortable: classes.rowComfortable,
    } as Record<string, string>),
    [classes],
  );

  const sizedColumns = React.useMemo(() => {
    return columns.map((column) => {
      const { field } = column;
      const width = columnWidths[field];
      if (width) {
        return {
          ...column,
          width,
        };
      }
      return column;
    });
  }, [columns, columnWidths]);

  const visibleColumns = React.useMemo(() => {
    return sizedColumns.filter((column) => columnVisibilityModel[column.field] !== false);
  }, [sizedColumns, columnVisibilityModel]);

  const sx = React.useMemo(
    () => ({
      height: height,
      width: isMobile && hiddenMenu ? window.innerWidth - 36 : '100%',
    }),
    [isMobile, height, hiddenMenu],
  );

  const noRowsLabel = React.useMemo(
    () => localeText?.noRowsLabel || t('noData'),
    [localeText, t],
  );

  const selectedIds = React.useMemo(() => new Set(rowsSelected || []), [rowsSelected]);

  const selectableRows = React.useMemo(() => {
    const rowsArray = Array.isArray(rows) ? rows : [];

    if (!actions?.isRowSelectable) {
      return rowsArray;
    }
    return rowsArray.filter((row) =>
      (actions.isRowSelectable as (params: RowParams) => boolean)(createRowParams(row)),
    ) || [];
  }, [rows, actions, createRowParams]);

  const allSelectableIds = React.useMemo<unknown[]>(
    () => selectableRows.map(getRowIdentifier).filter((id) => id !== undefined),
    [selectableRows, getRowIdentifier],
  );

  const allSelectedOnPage =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((id) => selectedIds.has(id));

  const handleSelectAll = React.useCallback(
    (event: React.SyntheticEvent) => {
      event.stopPropagation();
      if (!actions?.onRowsSelect) {
        return;
      }
      if (allSelectedOnPage) {
        const remaining = (rowsSelected || []).filter(
          (id) => !allSelectableIds.includes(id),
        );
        actions.onRowsSelect(keepNonExistentRowsSelected ? remaining : []);
      } else {
        const merged = new Set(rowsSelected || []);
        allSelectableIds.forEach((id) => merged.add(id));
        actions.onRowsSelect(Array.from(merged));
      }
    },
    [
      actions,
      allSelectedOnPage,
      allSelectableIds,
      rowsSelected,
      keepNonExistentRowsSelected,
    ],
  );

  const handleRowSelection = React.useCallback(
    (row: Row, event: React.SyntheticEvent) => {
      event.stopPropagation();
      if (!actions?.onRowsSelect) {
        return;
      }
      const rowId = getRowIdentifier(row);
      if (rowId === undefined || rowId === null) {
        return;
      }
      const nextSelection = new Set(rowsSelected || []);
      if (nextSelection.has(rowId)) {
        nextSelection.delete(rowId);
      } else {
        nextSelection.add(rowId);
      }
      actions.onRowsSelect(Array.from(nextSelection));
    },
    [actions, rowsSelected, getRowIdentifier],
  );

  const renderToolbar = React.useCallback(
    () => (
      <Toolbar
        classes={classes}
        t={t}
        search={search}
        handleSearch={handleSearch}
        actions={actions}
        controls={controls}
        CustomToolbar={CustomToolbar}
        CustomBottomToolbar={CustomBottomToolbar}
        filters={filters}
        data={rows}
        rowsSelected={rowsSelected}
        filterHandlers={filterHandlers}
        selectedFilters={selectedFilters}
        updateSelectedFilters={updateSelectedFilters}
        columns={sizedColumns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityChange={handleColumnVisibilityModelChange}
        density={density}
        onDensityChange={setDensity}
        onExport={() => {
          const headers = visibleColumns.map(
            (column) => column.headerName || column.field,
          );
          const escape = (value: unknown) => {
            if (value === null || value === undefined) return '';
            const stringValue =
              typeof value === 'string' || typeof value === 'number'
                ? String(value)
                : '';
            if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          };
          const csvRows = rows.map((row) => {
            return visibleColumns
              .map((column) => {
                const params = {
                  row,
                  field: column.field,
                  value:
                    typeof column.valueGetter === 'function'
                      ? column.valueGetter({
                        row,
                        field: column.field,
                        value: row?.[column.field],
                      })
                      : row?.[column.field],
                };
                if (column.valueFormatter) {
                  return escape(column.valueFormatter(params));
                }
                if (column.renderCell) {
                  const rendered = column.renderCell(params);
                  if (typeof rendered === 'string' || typeof rendered === 'number') {
                    return escape(rendered);
                  }
                  return '';
                }
                return escape(params.value);
              })
              .join(',');
          });
          const csvContent = [headers.join(','), ...csvRows].join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'export.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }}
      />
    ),
    [
      classes,
      t,
      search,
      handleSearch,
      actions,
      controls,
      CustomToolbar,
      CustomBottomToolbar,
      filters,
      rows,
      rowsSelected,
      filterHandlers,
      selectedFilters,
      updateSelectedFilters,
      sizedColumns,
      columnVisibilityModel,
      handleColumnVisibilityModelChange,
      density,
      visibleColumns,
    ],
  );

  const densityClassName = densityClasses[density] || densityClasses.standard;

  const renderHeaderCell = React.useCallback(
    (column: Column) => {
      const headerContent =
        typeof column.renderHeader === 'function'
          ? column.renderHeader(column)
          : column.headerName || column.field;
      const currentSort =
        sortModel.length && sortModel[0].field === column.field
          ? sortModel[0].sort
          : null;
      return (
        <div
          className={classNames({
            [classes.sortableHeadCell]: column.sortable !== false,
          })}
        >
          <span>{headerContent}</span>
          {column.sortable !== false && currentSort ? (
            <span className={classes.sortIcon}>
              {currentSort === 'asc' ? (
                <ArrowDropUpIcon fontSize="small" />
              ) : (
                <ArrowDropDownIcon fontSize="small" />
              )}
            </span>
          ) : null}
        </div>
      );
    },
    [classes.sortableHeadCell, classes.sortIcon, sortModel],
  );

  const renderCellValue = React.useCallback(
    (column: Column, row: Row) => {
      const baseParams = {
        row,
        field: column.field,
        value: row?.[column.field],
      };
      const value =
        typeof column.valueGetter === 'function'
          ? column.valueGetter(baseParams)
          : baseParams.value;
      const params = {
        ...baseParams,
        value,
      };
      if (column.renderCell) {
        return column.renderCell({
          ...params,
          id: getRowIdentifier(row),
        });
      }
      if (column.valueFormatter) {
        return column.valueFormatter(params);
      }
      return (value ?? '') as React.ReactNode;
    },
    [getRowIdentifier],
  );

  return (
    <Box sx={sx}>
      <Paper elevation={0} className={classes.tableContainer}>
        {!hiddenMenu ? renderToolbar() : null}
        <div className={classes.tableWrapper}>
          <LinearProgress className={classNames(classes.loadingBar, {
            [classes.hidden]: !loading,
          })}
          />
          <Table className={classes.table} size="small" stickyHeader>
            {!(hiddenMenu && isMobile) ? (
              <TableHead>
                <TableRow>
                  {checkable ? (
                    <TableCell
                      className={classNames(classes.headCell, classes.checkboxCell)}
                    >
                      <Checkbox
                        indeterminate={
                          !allSelectedOnPage && selectedIds.size > 0
                        }
                        checked={allSelectedOnPage}
                        onChange={handleSelectAll}
                        className={(classes as Record<string, string>).checkbox}
                        inputProps={{ 'aria-label': t('selectAll') }}
                      />
                    </TableCell>
                  ) : null}
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={column.field}
                      className={classes.headCell}
                      align={(column.headerAlign || column.align || 'left') as 'left' | 'right' | 'center'}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                      }}
                      onClick={() => handleSortModelChange(column)}
                    >
                      {renderHeaderCell(column)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
            ) : null}
            <TableBody>
              {!rows?.length && !loading ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + (checkable ? 1 : 0)}
                    className={classes.noRowsCell}
                  >
                    <Typography variant="body2">{noRowsLabel}</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {rows?.map((row, index) => {
                const rowId = getRowIdentifier(row);
                const key = rowId !== undefined && rowId !== null ? rowId as React.Key : index;
                const selectable =
                  !actions?.isRowSelectable ||
                  actions.isRowSelectable(createRowParams(row));
                return (
                  <TableRow
                    key={key}
                    hover
                    role="checkbox"
                    tabIndex={0}
                    className={classNames(
                      classes.rowBase,
                      densityClassName,
                      getRowClassName(row),
                    )}
                    selected={selectedIds.has(rowId)}
                    onClick={(event) => handleRowClick(row, event)}
                    onKeyDown={(event) => onCellKeyDown(row, event)}
                  >
                    {checkable ? (
                      <TableCell className={classes.checkboxCell}>
                        <Checkbox
                          checked={selectedIds.has(rowId)}
                          disabled={!selectable}
                          onChange={(event) => handleRowSelection(row, event)}
                          onClick={(event) => event.stopPropagation()}
                          inputProps={{ 'aria-label': t('selectRow') }}
                        />
                      </TableCell>
                    ) : null}
                    {visibleColumns.map((column) => (
                      <TableCell
                        key={`${String(rowId)}-${column.field}`}
                        align={(column.align || 'left') as 'left' | 'right' | 'center'}
                        style={{
                          width: column.width,
                          minWidth: column.minWidth,
                          maxWidth: column.maxWidth,
                        }}
                      >
                        {renderCellValue(column, row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {pagination ? (
          <>
            {showRowCount && renderRowCount()}
            <CustomPagination
              t={t}
              page={page}
              count={count}
              pageSize={pageSize}
              startPage={startPage}
              onChangePage={memoizedOnChangePage}
              onChangePageSize={memoizedOnChangePageSize}
              showRowCount={showRowCount}
            />
          </>
        ) : null}
      </Paper>
    </Box>
  );
};

export default DataGrid;
