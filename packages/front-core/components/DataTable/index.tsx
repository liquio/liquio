import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  Table,
  TableBody,
  TableContainer,
  TableCell,
  TableRow,
  ImageList,
  Divider
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';

import DataTableHeaderRaw from 'components/DataTable/DataTableHeader';
import DataTableRowRaw from 'components/DataTable/DataTableRow';
import DataTableCardRaw from 'components/DataTable/DataTableCard';
import DataTableToolbarRaw from 'components/DataTable/DataTableToolbar';
import CollapsedTableRowsRaw from 'components/DataTable/CollapsedTableRows';
import CollapsedTableCardsRaw from 'components/DataTable/CollapsedTableCards';
import DataTableFilterPresetBarRaw from 'components/DataTable/DataTableFilterPresetBar';
import DataTablePaginationRaw from 'components/DataTable/DataTablePagination';
import FullScreenDialogRaw from 'components/FullScreenDialog';
import PreloaderRaw from 'components/Preloader';
import arrayUnique from 'helpers/arrayUnique';

const DataTableHeader = DataTableHeaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTableRow = DataTableRowRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTableCard = DataTableCardRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTableToolbar = DataTableToolbarRaw as unknown as React.ComponentType<Record<string, unknown>>;
const CollapsedTableRows = CollapsedTableRowsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const CollapsedTableCards = CollapsedTableCardsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTableFilterPresetBar = DataTableFilterPresetBarRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTablePagination = DataTablePaginationRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FullScreenDialog = FullScreenDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface SortableTableBodyProps {
  items: (string | number)[];
  onDragEnd: (event: DragEndEvent) => void;
  children: React.ReactNode;
}

const SortableTableBody = ({ items, onDragEnd, children }: SortableTableBodyProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <TableBody>{children}</TableBody>
      </SortableContext>
    </DndContext>
  );
};

type AppTheme = Theme & {
  tableHeaderCell?: Record<string, unknown>;
  header?: { borderBottom?: string };
  tableNoMargin?: Record<string, unknown>;
};

const styles = (theme: AppTheme) => ({
  fixedTable: {
    tableLayout: 'fixed' as const
  },
  TableCell: {
    '&:first-child': {
      paddingRight: 0
    },
    [theme.breakpoints.down('md')]: {
      padding: '10px 5px',
      fontSize: 13,
      lineHeight: '18px'
    },
    ...(theme.tableHeaderCell || {})
  },
  cellDark: {
    borderBottom: theme?.header?.borderBottom
  },
  empty: {
    marginTop: 15,
    textAlign: 'center' as const,
    fontFamily: theme?.typography?.fontFamily,
    fontSize: theme?.typography?.fontSize,
    fontWeight: theme?.typography?.fontWeightRegular,
    lineHeight: '20px'
  },
  cardContainer: {
    padding: '8px 0 0 8px',
    margin: '0 !important'
  },
  stickyHeader: {
    max: 'red',
    '& th': {
      paddingTop: 10,
      paddingBottom: 20
    }
  },
  fullscreentoolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 0
  },
  dialogContent: {
    paddingLeft: 20,
    paddingRight: 20
  },
  fullscreenIcon: {
    position: 'relative' as const,
    right: -13
  },
  tableNoMargin: {
    paddingBottom: 20,
    ...(theme.tableNoMargin || {})
  },
  tableContainer: {
    '&::-webkit-scrollbar': {
      height: 8
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme?.palette?.primary?.main
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f1f1'
    }
  },
  table: {
    paddingBottom: 8
  },
  tableDark: {
    marginLeft: 8,
    marginRight: 8
  },
  tableContainerDark: {
    marginBottom: 20
  },
  fieldBorder: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    border: '#aaa 2px dashed',
    borderTop: 'none'
  }
});

interface RowItem {
  id?: string;
  value?: string;
  name?: string;
  meta?: { isClickable?: boolean };
  [key: string]: unknown;
}

interface DataTableProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  components?: { DataTableCard?: React.ComponentType<Record<string, unknown>> };
  controls?: {
    toolbar?: boolean;
    bottomToolbar?: boolean;
    presets?: boolean;
    header?: boolean;
    bottomPagination?: boolean;
    sortableRows?: boolean;
    rowDragHandleColumnId?: string;
    [key: string]: unknown;
  };
  hightlight?: unknown[];
  rowsSelected?: unknown[];
  view?: string;
  fixedTable?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number | null;
  hiddenRows?: string[];
  multiple?: boolean;
  data?: RowItem[] | null;
  columns?: Record<string, unknown>[];
  checkable?: boolean;
  emptyDataText?: string;
  darkTheme?: boolean;
  maxTextRows?: number;
  groupBy?: string;
  hiddenColumns?: string[];
  hightlightRows?: unknown[];
  actions?: Record<string, unknown> & {
    onColumnSortChange?: (columnId: string, order: string) => void;
    onChangeRowsPerPage?: (value: number) => void;
    onChangePage?: (page: number) => void;
    onRowsSelect?: (selection: unknown[]) => void;
    isRowSelectable?: (row: RowItem) => boolean;
    onRowSortEnd?: (payload: Record<string, unknown>) => void;
  };
  onRowClick?: (item: RowItem, key: number) => void;
  getRowSortId?: (row: RowItem, index: number) => string | number;
  onRowSortEnd?: (payload: Record<string, unknown>) => void;
  cellStyle?: React.CSSProperties;
  editPopupMode?: boolean;
  cellColor?: (item: RowItem, id?: string) => string;
  hover?: boolean;
  errors?: Record<string, unknown>[];
  warningRows?: number[];
  errorRows?: number[];
  fileStorage?: Record<string, unknown>;
  count?: number;
  page?: number;
  rowsPerPage?: number;
  noMargin?: boolean;
  filters?: Record<string, unknown>;
  presets?: unknown[];
  filterHandlers?: Record<string, unknown>;
  loading?: boolean;
  dragEvents?: Record<string, unknown>;
  tableProps?: Record<string, unknown>;
  tableTitle?: string;
  fieldBorder?: boolean;
  className?: string;
  [key: string]: unknown;
}

interface DataTableState {
  view?: string;
  grouping: boolean;
  fullscreen: boolean;
}

class DataTable extends React.Component<DataTableProps, DataTableState> {
  static defaultProps = {
    view: 'table',
    hightlight: [],
    rowsSelected: [],
    components: {},
    fixedTable: false,
    stickyHeader: true,
    controls: {
      pagination: false,
      toolbar: true,
      search: true,
      header: true,
      refresh: true,
      switchView: true,
      presets: true,
      bottomToolbar: false,
      fullScreenMode: false,
      selectAllButton: true
    },
    fullscreenMode: false,
    maxHeight: null,
    hiddenRows: [],
    multiple: true
  };

  constructor(props: DataTableProps) {
    super(props);
    this.state = {
      view: this.props.view,
      grouping: false,
      fullscreen: false
    };
  }

  switchView = () =>
    this.setState({
      view: this.state.view === 'table' ? 'cell' : 'table'
    });

  toggleGrouping = () => {
    const { grouping } = this.state;
    this.setState({ grouping: !grouping });
  };

  createSortHandler = (columnId: string) => () => {
    const {
      sort,
      actions: { onColumnSortChange } = {}
    } = this.props as DataTableProps & { sort: Record<string, string> };
    const order = sort[columnId] === 'desc' ? 'asc' : 'desc';
    onColumnSortChange && onColumnSortChange(columnId, order);
  };

  changeRowsPerPage = ({ target: { value } }: { target: { value: string } }) => {
    const {
      actions: { onChangeRowsPerPage } = {}
    } = this.props;
    onChangeRowsPerPage && onChangeRowsPerPage(Number(value));
  };

  goToPage = (e: unknown, page: number) => {
    const {
      actions: { onChangePage } = {}
    } = this.props;
    onChangePage && onChangePage(page);
  };

  handleSelectRow = (itemId: unknown) => () => {
    const {
      rowsSelected = [],
      actions: { onRowsSelect } = {}
    } = this.props;
    if (rowsSelected.includes(itemId)) {
      rowsSelected.splice(rowsSelected.indexOf(itemId), 1);
    } else {
      rowsSelected.push(itemId);
    }

    onRowsSelect && onRowsSelect([...rowsSelected]);
  };

  selectAllRows = () => {
    const {
      rowsSelected = [],
      data,
      actions: { onRowsSelect, isRowSelectable } = {}
    } = this.props;

    if (rowsSelected.length) {
      onRowsSelect && onRowsSelect([]);
    } else {
      onRowsSelect && onRowsSelect((data || []).filter(isRowSelectable || Boolean).map(({ id }) => id));
    }
  };

  // Dead code: never invoked anywhere in this class (renderBody calls
  // onRowClick.bind(this, row, key) directly instead) — kept as-is.
  handleClick = (item: RowItem) => () => {
    const { onRowClick } = this.props;
    onRowClick && (onRowClick as (item: RowItem) => void)(item);
  };

  getRowSortId = (row: RowItem, index: number): string | number => {
    const { getRowSortId } = this.props;

    if (typeof getRowSortId === 'function') {
      return getRowSortId(row, index);
    }

    return row?.id ?? row?.value ?? index;
  };

  handleRowSortEnd = ({ active, over }: DragEndEvent) => {
    if (!active?.id || !over?.id || active.id === over.id) {
      return;
    }

    const { onRowSortEnd, actions, data } = this.props;
    const handler = onRowSortEnd || actions?.onRowSortEnd;

    if (!handler || !Array.isArray(data)) {
      return;
    }

    const activeIndex = data.findIndex((row, index) => this.getRowSortId(row, index) === active.id);
    const overIndex = data.findIndex((row, index) => this.getRowSortId(row, index) === over.id);

    if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
      return;
    }

    handler({
      activeId: active.id,
      overId: over.id,
      activeIndex,
      overIndex,
      activeRow: data[activeIndex],
      overRow: data[overIndex]
    });
  };

  renderPreloading = () => {
    const { columns, checkable } = this.props;
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={(columns || []).length + (checkable ? 1 : 0)}
            style={{ borderBottom: 'none' }}
          >
            <Preloader />
          </TableCell>
        </TableRow>
      </TableBody>
    );
  };

  renderEmptyData = () => {
    const { t, columns, checkable, emptyDataText, classes, darkTheme } = this.props;
    return (
      <TableBody>
        <TableRow>
          <TableCell
            align="center"
            colSpan={(columns || []).length + (checkable ? 1 : 0)}
            className={classNames({
              [classes.cellDark]: !!darkTheme
            })}
          >
            {emptyDataText || t('EmptyData')}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  };

  renderBody = () => {
    const {
      maxTextRows,
      t,
      data,
      groupBy,
      columns,
      hiddenColumns,
      rowsSelected,
      hightlight,
      checkable,
      actions,
      onRowClick,
      cellStyle,
      editPopupMode,
      cellColor,
      hover,
      hiddenRows = [],
      darkTheme,
      errors,
      warningRows,
      errorRows,
      multiple,
      controls
    } = this.props;
    const { grouping, fullscreen } = this.state;

    const { isRowSelectable } = actions || {};

    if (!columns || !Array.isArray(columns)) {
      return (
        <TableRow>
          <TableCell>define columns pls</TableCell>
        </TableRow>
      );
    }

    if (!data) {
      return this.renderPreloading();
    }

    if (Array.isArray(data) && data.length === 0) {
      return this.renderEmptyData();
    }

    const renderRow = (row: RowItem, key: number) => {
      if (hiddenRows.includes(row.name as string)) return null;
      const selectable = isRowSelectable ? isRowSelectable(row) : true;
      const disabled =
        !selectable || (!multiple && (rowsSelected?.length || 0) > 0 && !rowsSelected?.includes(row.id));
      const disableClick = row?.meta?.isClickable === false;

      return (
        <DataTableRow
          t={t}
          key={key}
          hover={disableClick ? false : hover}
          rowIndex={key}
          item={row}
          cellStyle={cellStyle}
          cellColor={cellColor}
          errors={errors}
          warningRows={warningRows}
          errorRows={errorRows}
          hightlight={
            hightlight && (row.id || row.value) && hightlight.includes(row.id || row.value)
          }
          selected={
            rowsSelected && (row.id || row.value) && rowsSelected.includes(row.id || row.value)
          }
          selectable={selectable}
          checkable={checkable}
          columns={columns}
          hiddenColumns={hiddenColumns}
          onSelect={this.handleSelectRow(row.id || row.value)}
          onClick={onRowClick && !disableClick ? onRowClick.bind(this, row, key) : null}
          editPopupMode={editPopupMode}
          fullscreen={fullscreen}
          darkTheme={darkTheme}
          maxTextRows={maxTextRows}
          disabled={disabled}
          sortableId={this.getRowSortId(row, key)}
          sortableEnabled={Boolean(controls?.sortableRows)}
          dragHandleColumnId={controls?.rowDragHandleColumnId}
        />
      );
    };

    if (groupBy && grouping) {
      const groups = arrayUnique(
        ([] as unknown[]).concat(...data.map(({ [groupBy]: group }) => group))
      );
      return (
        <TableBody>
          {groups.map((group) => (
            <CollapsedTableRows
              key={group as React.Key}
              title={group}
              renderRow={renderRow}
              colSpan={(columns || []).length + (checkable ? 1 : 0)}
              data={data.filter(({ [groupBy]: filterData }) =>
                ([] as unknown[]).concat(filterData).includes(group)
              )}
            />
          ))}
          <CollapsedTableRows
            title={t('WithoutGroup')}
            renderRow={renderRow}
            colSpan={(columns || []).length + (checkable ? 1 : 0)}
            data={data.filter(({ [groupBy]: filterData }) => !filterData || !(filterData as unknown[]).length)}
          />
        </TableBody>
      );
    }

    const rowItems = data.filter(Boolean);

    if (controls?.sortableRows) {
      return (
        <SortableTableBody
          items={rowItems.map((row, index) => this.getRowSortId(row, index))}
          onDragEnd={this.handleRowSortEnd}
        >
          {rowItems.map(renderRow)}
        </SortableTableBody>
      );
    }

    return <TableBody>{rowItems.map(renderRow)}</TableBody>;
  };

  renderCards = () => {
    const { t, data, classes, actions, fileStorage, rowsSelected, columns, groupBy, components = {} } =
      this.props;

    const { grouping } = this.state;

    if (!data) {
      return <Preloader />;
    }

    if (Array.isArray(data) && data.length === 0) {
      return this.renderEmptyData();
    }

    const CardComponent = components.DataTableCard || DataTableCard;

    const renderCard = (row: RowItem, key: number) => (
      <CardComponent
        key={key}
        item={row}
        actions={actions}
        selected={rowsSelected && row.id && rowsSelected.includes(row.id)}
        selectable={true}
        checkable={true}
        fileStorage={fileStorage}
        columns={columns}
        onSelect={this.handleSelectRow(row.id)}
      />
    );

    if (groupBy && grouping) {
      const groups = arrayUnique(
        ([] as unknown[]).concat(...data.map(({ [groupBy]: group }) => group))
      );
      return (
        <>
          {groups.map((group) => (
            <CollapsedTableCards
              key={group as React.Key}
              title={group}
              renderCard={renderCard}
              data={data.filter(({ [groupBy]: filterData }) =>
                ([] as unknown[]).concat(filterData).includes(group)
              )}
            />
          ))}
          <CollapsedTableCards
            title={t('WithoutGroup')}
            renderCard={renderCard}
            data={data.filter(({ [groupBy]: filterData }) => !filterData || !(filterData as unknown[]).length)}
          />
        </>
      );
    }

    return <ImageList className={classes.cardContainer}>{data.map(renderCard)}</ImageList>;
  };

  renderTableContent = () => {
    const { data } = this.props;
    const { view } = this.state;

    if (!data) {
      return this.renderPreloading();
    }

    if (Array.isArray(data) && data.length === 0) {
      return this.renderEmptyData();
    }

    if (view === 'table') {
      return this.renderBody();
    }

    return null;
  };

  renderToolBar = (props?: { bottomToolbar?: boolean }) => {
    const { groupBy, className, multiple } = this.props;
    const { view, grouping, fullscreen } = this.state;
    const { ...clearProps } = this.props;

    return (
      <DataTableToolbar
        {...(clearProps as unknown as Record<string, unknown>)}
        view={view}
        switchView={this.switchView}
        groupBy={groupBy}
        grouping={grouping}
        fullscreen={fullscreen}
        toggleGrouping={this.toggleGrouping}
        toggleFullscreen={this.toggleFullscreen}
        bottomToolbar={props && props.bottomToolbar}
        className={className}
        multiple={multiple}
      />
    );
  };

  toggleFullscreen = () => {
    const { fullscreen } = this.state;
    this.setState({
      fullscreen: !fullscreen
    });
  };

  renderTable = () => {
    const {
      t,
      classes,
      actions,
      count,
      page = 0,
      rowsPerPage,
      controls,
      fixedTable,
      stickyHeader,
      maxHeight,
      noMargin,
      filters,
      presets,
      filterHandlers,
      darkTheme,
      loading
    } = this.props;
    const { view, fullscreen } = this.state;

    return (
      <>
        {controls?.toolbar && !controls.bottomToolbar && !maxHeight ? this.renderToolBar() : null}
        {controls?.presets ? (
          <DataTableFilterPresetBar
            actions={actions}
            filters={filters}
            presets={presets}
            filterHandlers={filterHandlers}
          />
        ) : null}

        <div
          className={classNames({
            [classes.tableNoMargin]: !noMargin,
            [classes.tableDark]: !!darkTheme
          })}
        >
          {view === 'table' ? (
            <TableContainer
              className={classNames(classes.tableContainer, {
                [classes.stickyHeader]: !!maxHeight && !fullscreen,
                [classes.tableContainerDark]: !!darkTheme
              })}
              style={{
                maxHeight: fullscreen ? 'calc(100vh - 130px)' : maxHeight || 'unset'
              }}
            >
              <Table
                stickyHeader={stickyHeader}
                className={classNames(classes.table, {
                  [classes.fixedTable]: !!fixedTable
                })}
              >
                {view === 'table' && controls?.header ? (
                  <DataTableHeader createSortHandler={this.createSortHandler} {...(this.props as unknown as Record<string, unknown>)} />
                ) : null}
                {this.renderTableContent()}
              </Table>
            </TableContainer>
          ) : (
            <>
              {this.renderCards()}
              <Divider light={true} />
            </>
          )}

          {controls?.toolbar && controls.bottomToolbar
            ? this.renderToolBar({ bottomToolbar: true })
            : null}

          {controls?.bottomPagination ? (
            <DataTablePagination
              t={t}
              rowsPerPage={rowsPerPage}
              page={page - 1}
              count={count}
              loading={loading}
              onChangePage={actions?.onChangePage}
              onChangeRowsPerPage={actions?.onChangeRowsPerPage}
              darkTheme={darkTheme}
            />
          ) : null}
        </div>
      </>
    );
  };

  render = () => {
    const { dragEvents, tableProps = {}, tableTitle, fieldBorder, classes } = this.props;
    const { fullscreen } = this.state;

    return (
      <div
        {...(tableProps as Record<string, unknown>)}
        {...(dragEvents as Record<string, unknown>)}
        className={classNames({ [classes.fieldBorder]: !!fieldBorder })}
      >
        {fullscreen ? (
          <FullScreenDialog open={true} title={tableTitle} onClose={this.toggleFullscreen}>
            {this.renderTable()}
          </FullScreenDialog>
        ) : (
          this.renderTable()
        )}
      </div>
    );
  };
}

const styled = withStyles(styles)(DataTable as never);

export default translate('DataTable')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
export { default as DataTableStated } from './DataTableStated';
