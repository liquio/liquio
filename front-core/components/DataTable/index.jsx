import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {
  Table,
  TableBody,
  TableContainer,
  TableCell,
  TableRow,
  ImageList,
  Divider
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import DataTableHeader from 'components/DataTable/DataTableHeader';
import DataTableRow from 'components/DataTable/DataTableRow';
import DataTableCard from 'components/DataTable/DataTableCard';
import DataTableToolbar from 'components/DataTable/DataTableToolbar';
import CollapsedTableRows from 'components/DataTable/CollapsedTableRows';
import CollapsedTableCards from 'components/DataTable/CollapsedTableCards';
import DataTableFilterPresetBar from 'components/DataTable/DataTableFilterPresetBar';
import DataTablePagination from 'components/DataTable/DataTablePagination';
import FullScreenDialog from 'components/FullScreenDialog';
import Preloader from 'components/Preloader';
import arrayUnique from 'helpers/arrayUnique';

const styles = (theme) => ({
  fixedTable: {
    tableLayout: 'fixed'
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
    textAlign: 'center',
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
    position: 'relative',
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

class DataTable extends React.Component {
  constructor(props) {
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

  createSortHandler = (columnId) => () => {
    const {
      sort,
      actions: { onColumnSortChange }
    } = this.props;
    const order = sort[columnId] === 'desc' ? 'asc' : 'desc';
    onColumnSortChange && onColumnSortChange(columnId, order);
  };

  changeRowsPerPage = ({ target: { value } }) => {
    const {
      actions: { onChangeRowsPerPage }
    } = this.props;
    onChangeRowsPerPage && onChangeRowsPerPage(value);
  };

  goToPage = (e, page) => {
    const {
      actions: { onChangePage }
    } = this.props;
    onChangePage && onChangePage(page);
  };

  handleSelectRow = (itemId) => () => {
    const {
      rowsSelected,
      actions: { onRowsSelect }
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
      rowsSelected,
      data,
      actions: { onRowsSelect, isRowSelectable }
    } = this.props;

    if (rowsSelected.length) {
      onRowsSelect && onRowsSelect([]);
    } else {
      onRowsSelect && onRowsSelect(data.filter(isRowSelectable).map(({ id }) => id));
    }
  };

  handleClick = (item) => () => {
    const { onRowClick } = this.props;
    onRowClick && onRowClick(item);
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
              [classes.cellDark]: darkTheme
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
      hiddenRows,
      darkTheme,
      errors,
      warningRows,
      errorRows,
      multiple
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

    const renderRow = (row, key) => {
      if (hiddenRows.includes(row.name)) return null;
      const selectable = isRowSelectable ? isRowSelectable(row) : true;
      const disabled =
        !selectable || (!multiple && rowsSelected?.length > 0 && !rowsSelected.includes(row.id));
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
        />
      );
    };

    if (groupBy && grouping) {
      const groups = arrayUnique([].concat(...data.map(({ [groupBy]: group }) => group)));
      return (
        <TableBody>
          {groups.map((group) => (
            <CollapsedTableRows
              key={group}
              title={group}
              renderRow={renderRow}
              colSpan={(columns || []).length + (checkable ? 1 : 0)}
              data={data.filter(({ [groupBy]: filterData }) =>
                [].concat(filterData).includes(group)
              )}
            />
          ))}
          <CollapsedTableRows
            title={t('WithoutGroup')}
            renderRow={renderRow}
            colSpan={(columns || []).length + (checkable ? 1 : 0)}
            data={data.filter(({ [groupBy]: filterData }) => !filterData || !filterData.length)}
          />
        </TableBody>
      );
    }

    return <TableBody>{data.filter(Boolean).map(renderRow)}</TableBody>;
  };

  renderCards = () => {
    const { t, data, classes, actions, fileStorage, rowsSelected, columns, groupBy, components } =
      this.props;

    const { grouping } = this.state;

    if (!data) {
      return <Preloader />;
    }

    if (Array.isArray(data) && data.length === 0) {
      return this.renderEmptyData();
    }

    const CardComponent = components.DataTableCard || DataTableCard;

    const renderCard = (row, key) => (
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
      const groups = arrayUnique([].concat(...data.map(({ [groupBy]: group }) => group)));
      return (
        <>
          {groups.map((group) => (
            <CollapsedTableCards
              key={group}
              title={group}
              renderCard={renderCard}
              data={data.filter(({ [groupBy]: filterData }) =>
                [].concat(filterData).includes(group)
              )}
            />
          ))}
          <CollapsedTableCards
            title={t('WithoutGroup')}
            renderCard={renderCard}
            data={data.filter(({ [groupBy]: filterData }) => !filterData || !filterData.length)}
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

  renderToolBar = (props) => {
    const { groupBy, className, multiple } = this.props;
    const { view, grouping, fullscreen } = this.state;
    const { ...clearProps } = this.props;

    return (
      <DataTableToolbar
        {...clearProps}
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
      page,
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
        {controls.toolbar && !controls.bottomToolbar && !maxHeight ? this.renderToolBar() : null}
        {controls.presets ? (
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
            [classes.tableDark]: darkTheme
          })}
        >
          {view === 'table' ? (
            <TableContainer
              className={classNames(classes.tableContainer, {
                [classes.stickyHeader]: maxHeight && !fullscreen,
                [classes.tableContainerDark]: darkTheme
              })}
              style={{
                maxHeight: fullscreen ? 'calc(100vh - 130px)' : maxHeight || 'unset'
              }}
            >
              <Table
                stickyHeader={stickyHeader}
                className={classNames(classes.table, {
                  [classes.fixedTable]: fixedTable
                })}
              >
                {view === 'table' && controls.header ? (
                  <DataTableHeader createSortHandler={this.createSortHandler} {...this.props} />
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

          {controls.toolbar && controls.bottomToolbar
            ? this.renderToolBar({ bottomToolbar: true })
            : null}

          {controls.bottomPagination ? (
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
        {...tableProps}
        {...dragEvents}
        className={classNames({ [classes.fieldBorder]: fieldBorder })}
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

DataTable.propTypes = {
  classes: PropTypes.object.isRequired,
  components: PropTypes.object,
  controls: PropTypes.object,
  hightlight: PropTypes.array,
  rowsSelected: PropTypes.array,
  view: PropTypes.string,
  fixedTable: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  maxHeight: PropTypes.number,
  hiddenRows: PropTypes.array,
  multiple: PropTypes.bool
};

DataTable.defaultProps = {
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

const styled = withStyles(styles)(DataTable);

export default translate('DataTable')(styled);
export { default as DataTableStated } from './DataTableStated';
