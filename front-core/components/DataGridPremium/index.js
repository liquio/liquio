import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import MobileDetect from 'mobile-detect';
import { useTranslate } from 'react-translate';
import { makeStyles } from '@mui/styles';
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

const useStyles = makeStyles((theme) => ({
  highlightedRow: {
    backgroundColor: theme.dataTableHighlights,
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
    flexWrap: 'wrap',
  },
  selectedFiltersClear: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  selectedFiltersItem: {
    maxWidth: '452px',
    border: '1px solid #D2D2D2',
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
    flexWrap: 'wrap',
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
      flexWrap: 'wrap',
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
      theme?.toolbarQuickFilter?.backgroundColor || theme.leftSidebarBg,
    borderRadius: theme?.toolbarQuickFilter?.borderRadius || 40,
    padding: 0,
    minWidth: 320,
    '& fieldset': {
      transition: 'border-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
      borderColor: 'transparent',
    },
    '& .MuiInputBase-root': {
      height: 40,
      borderRadius: theme?.toolbarQuickFilter?.borderRadius || 40,
      '&.Mui-focused': {
        '& fieldset': {
          border: theme?.toolbarQuickFilter?.borderActive,
        },
      },
      '& fieldset': {
        border: theme?.toolbarQuickFilter?.border || 'none',
      },
      '&:hover': {
        '& fieldset': {
          border: theme?.toolbarQuickFilter?.borderHover || '2px solid #0068FF',
        },
      },
    },
    '& .Mui-focused fieldset': {
      border: theme?.toolbarQuickFilter?.borderFocus || '2px solid #0068FF',
    },
    [theme.breakpoints.down('sm')]: {
      minWidth: 'unset',
      width: '100%',
    },
  },
  buttonSm: {
    [theme.breakpoints.down('sm')]: {
      ...(theme.filtersButtonMobile || {}),
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
    borderTop: '1px solid #e0e0e0',
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  clearAll: {
    color: '#B01038',
    borderColor: '#B01038',
    borderRadius: '28px',
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '20px',
    padding: '6px 12px',
    '&:hover': {
      borderColor: '#B01038',
      backgroundColor: 'transparent',
    },
  },
  filterLabel: {
    color: '#444444',
    lineHeight: '20px',
  },
  closeBtn: {
    marginLeft: '11px',
    '& svg': {
      width: '10px',
      height: '10px',
      fill: '#B01038',
    },
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  toolbarRoot: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  tableContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  tableWrapper: {
    flex: 1,
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headCell: {
    height: 52,
    fontWeight: 600,
    backgroundColor: theme.palette.background.default,
    position: 'sticky',
    top: 0,
    zIndex: 1,
    borderBottom: '1px solid #E0E0E0',
  },
  sortableHeadCell: {
    cursor: 'pointer',
    userSelect: 'none',
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
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  loadingBar: {
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
}));

const COLUMN_WIDTHS_STORAGE_KEY = 'dataGrid.columnWidths';
const COLUMN_VISIBILITY_STORAGE_KEY = 'dataGrid.columnVisibility';

const DataGrid = (props) => {
  const {
    rows = [],
    columns = [],
    highlight = [],
    loading,
    onRowClick,
    actions,
    search: searchProps,
    rowsPerPage: pageSize,
    checkable,
    controls,
    count,
    page,
    sort,
    keepNonExistentRowsSelected,
    CustomToolbar,
    CustomBottomToolbar,
    filters,
    rowsSelected,
    filterHandlers,
    startPage,
    columnVisibilityModel: columnVisibilityModelProps,
    pagination,
    showRowCount,
    getRowId,
    height,
    onColumnVisibilityCallback,
    hiddenMenu,
    localeText,
    selectedFilters,
    updateSelectedFilters,
  } = props;

  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobileDevice =
      typeof props.isMobile === 'boolean' ? props.isMobile : !!md.mobile();
    return isMobileDevice;
  });
  const timeoutRef = React.useRef(null);
  const [search, setSearch] = React.useState(searchProps);
  const [columnVisibilityModel, setColumnVisibilityModel] = React.useState(
    () => ({
      ...JSON.parse(storage.getItem(COLUMN_VISIBILITY_STORAGE_KEY) || '{}'),
      ...columnVisibilityModelProps,
    }),
  );
  const [sortModel, setSortModel] = React.useState(() =>
    Object.keys(sort || {}).map((field) => ({
      field,
      sort: sort[field],
    })),
  );
  const [columnWidths] = React.useState(() => {
    return JSON.parse(storage.getItem(COLUMN_WIDTHS_STORAGE_KEY) || '{}');
  });
  const [density, setDensity] = React.useState('standard');

  const classes = useStyles();
  const t = useTranslate('Elements');

  const getRowIdentifier = React.useCallback(
    (row) => {
      if (typeof getRowId === 'function') {
        return getRowId(row);
      }
      return row?.id;
    },
    [getRowId],
  );

  const createRowParams = React.useCallback(
    (row) => ({
      id: getRowIdentifier(row),
      row,
    }),
    [getRowIdentifier],
  );

  const onCellKeyDown = React.useCallback(
    (row, event) => {
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

  const memoizedOnChangePage = React.useCallback(actions.onChangePage, [
    actions.onChangePage,
  ]);

  const memoizedOnSortChange = React.useCallback(actions.onColumnSortChange, [
    actions.onColumnSortChange,
  ]);

  const memoizedOnChangePageSize = React.useCallback(
    actions.onChangeRowsPerPage,
    [actions.onChangeRowsPerPage],
  );

  const getRowClassName = React.useCallback(
    (row) => {
      const params = createRowParams(row);
      const clickable =
        onRowClick && (!actions?.isRowClickable || actions.isRowClickable(params));
      const rowId = params.id;
      return classNames({
        [classes.highlightedRow]: rowId !== undefined && highlight.includes(rowId),
        [classes.clickableRow]: clickable,
      });
    },
    [highlight, onRowClick, classes, actions, createRowParams],
  );

  const handleRowClick = React.useCallback(
    (row, event) => {
      const params = createRowParams(row);
      if (actions?.isRowClickable && !actions.isRowClickable(params)) {
        event?.stopPropagation?.();
        event?.preventDefault?.();
        return;
      }
      onRowClick && onRowClick(params, event);
    },
    [actions, onRowClick, createRowParams],
  );

  const handleSearch = React.useCallback(
    ({ target: { value } }) => {
      setSearch(value);

      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        actions.onSearchChange && actions.onSearchChange(value, true);
      }, 500);
    },
    [actions, setSearch],
  );

  const handleSortModelChange = React.useCallback((column) => {
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
    (field, isVisible) => {
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
    }),
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
      actions.isRowSelectable(createRowParams(row)),
    ) || [];
  }, [rows, actions, createRowParams]);

  const allSelectableIds = React.useMemo(
    () => selectableRows.map(getRowIdentifier).filter((id) => id !== undefined),
    [selectableRows, getRowIdentifier],
  );

  const allSelectedOnPage =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((id) => selectedIds.has(id));

  const handleSelectAll = React.useCallback(
    (event) => {
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
    (row, event) => {
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
          const escape = (value) => {
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
    (column) => {
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
    (column, row) => {
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
      return value ?? '';
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
                        className={classes.checkbox}
                        inputProps={{ 'aria-label': t('selectAll') }}
                      />
                    </TableCell>
                  ) : null}
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={column.field}
                      className={classes.headCell}
                      align={column.headerAlign || column.align || 'left'}
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
                const key = rowId !== undefined && rowId !== null ? rowId : index;
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
                        key={`${rowId}-${column.field}`}
                        align={column.align || 'left'}
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

DataGrid.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.array])),
  columns: PropTypes.arrayOf(PropTypes.object),
  highlight: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  loading: PropTypes.bool,
  actions: PropTypes.object,
  filters: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  filterHandlers: PropTypes.object,
  rowsPerPage: PropTypes.number,
  checkable: PropTypes.bool,
  controls: PropTypes.object,
  count: PropTypes.number,
  page: PropTypes.number,
  keepNonExistentRowsSelected: PropTypes.bool,
  sort: PropTypes.object,
  CustomToolbar: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
  CustomBottomToolbar: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
  rowsSelected: PropTypes.array,
  unstableHeaderFilters: PropTypes.object,
  startPage: PropTypes.number,
  columnVisibilityModel: PropTypes.object,
  pagination: PropTypes.bool,
  showRowCount: PropTypes.bool,
  getRowId: PropTypes.func,
  onRowClick: PropTypes.func,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onColumnVisibilityCallback: PropTypes.func,
  hiddenMenu: PropTypes.bool,
  localeText: PropTypes.object,
  search: PropTypes.string,
  selectedFilters: PropTypes.array,
  updateSelectedFilters: PropTypes.func,
  previewAttach: PropTypes.bool,
  isMobile: PropTypes.bool,
};

DataGrid.defaultProps = {
  rows: [],
  columns: [],
  highlight: [],
  loading: false,
  actions: {},
  filters: {},
  checkable: false,
  controls: {},
  count: 0,
  page: 1,
  rowsPerPage: 10,
  keepNonExistentRowsSelected: true,
  sort: {},
  CustomToolbar: null,
  CustomBottomToolbar: null,
  rowsSelected: [],
  filterHandlers: null,
  unstableHeaderFilters: null,
  startPage: null,
  columnVisibilityModel: {},
  pagination: true,
  showRowCount: false,
  getRowId: null,
  onRowClick: () => { },
  height: '100%',
  onColumnVisibilityCallback: () => { },
  hiddenMenu: false,
  localeText: {},
  search: '',
  selectedFilters: [],
  updateSelectedFilters: () => { },
  previewAttach: false,
  isMobile: undefined,
};

export default DataGrid;
