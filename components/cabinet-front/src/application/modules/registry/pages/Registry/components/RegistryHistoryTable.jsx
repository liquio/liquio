import React from 'react';
import { translate } from 'react-translate';
import { Paper, IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import objectPath from 'object-path';
import moment from 'moment';
import classNames from 'classnames';
import {
  DataTypeProvider,
  CustomPaging,
  PagingState,
  SearchState
} from '@devexpress/dx-react-grid';
import {
  Grid,
  Table,
  Toolbar,
  TableHeaderRow,
  ColumnChooser,
  DragDropProvider,
  TableColumnVisibility,
  TableColumnReordering,
  TableColumnResizing
} from '@devexpress/dx-react-grid-material-ui';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardTabIcon from '@mui/icons-material/KeyboardTab';

import TimeLabel from 'components/Label/Time';
import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';
import StringElement from 'components/JsonSchema/elements/StringElement';
import endPoint from 'application/endPoints/registryHistory';
import dataTableConnect from 'services/dataTable/connect';
import DirectPreview from 'components/FileDataTable/components/DirectPreview';
import HighlightText from 'components/HighlightText';
import evaluate from 'helpers/evaluate';
import storage from 'helpers/storage';
import processList from 'services/processList';
import RegistryModal from './RegistryModal';

const styles = { flex: { flex: 1 } };

const TableRow =
  (handleClick) =>
  ({ row, ...restProps }) => (
    <Table.Row {...restProps} onClick={() => handleClick(row)} style={{ cursor: 'pointer' }} />
  );

const initialState = (t) => ({
  error: null,
  columns: [
    {
      name: 'operation',
      title: t('Operation')
    },
    {
      name: 'data',
      title: t('Name')
    },
    {
      name: 'person',
      title: t('CreatedBy')
    },
    {
      name: 'meta.person.id',
      title: t('UserId')
    },
    {
      name: 'meta.person.name',
      title: t('UserPIB')
    },
    {
      name: 'createdAt',
      title: t('CreatedAt')
    },
    {
      name: 'updatedBy',
      title: t('UpdatedBy')
    },
    {
      name: 'updatedAt',
      title: t('UpdatedAt')
    }
  ],
  tableColumnExtensions: [{ columnName: 'person', align: 'right' }],
  columnWidths: [
    { columnName: 'operation', width: 120 },
    { columnName: 'data', width: 640 },
    { columnName: 'person', width: 240 },
    { columnName: 'createdAt', width: 160 }
  ],
  columnOrder: ['createdAt', 'operation', 'meta.person.id', 'meta.person.name', 'data', 'person'],
  hiddenColumns: [],
  customColumns: []
});

class RegistryHistoryTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.propsToState(initialState(props.t), props);
  }

  componentDidMount() {
    this.init();
  }

  componentDidUpdate() {
    const {
      filters: { keyId },
      selectedKey
    } = this.props;
    if (selectedKey && keyId !== selectedKey.id) {
      this.init();
    }
  }

  componentWillReceiveProps(nextProps) {
    const defaultProps = initialState(nextProps.t);
    this.setState(this.propsToState(defaultProps, nextProps), this.forceUpdate);
  }

  init = async () => {
    const { t, actions, selectedKey } = this.props;

    if (
      selectedKey &&
      !processList.has(
        'RegistryHistoryTableLoad',
        actions.onFilterChange,
        { keyId: selectedKey.id },
        true
      )
    ) {
      actions.clearFilters();
      const result = await processList.hasOrSet(
        'RegistryHistoryTableLoad',
        actions.onFilterChange,
        { keyId: selectedKey.id },
        true
      );
      this.setState({
        error: result instanceof Error ? new Error(t(result.message)) : null
      });
    }
  };

  hiddenColumnsNames = () => {
    const { selectedKey } = this.props;

    if (!selectedKey) {
      return [];
    }

    const registryTableSettings = JSON.parse(storage.getItem('registryTableSettings') || '{}');
    const { hiddenColumnNames } = registryTableSettings[selectedKey.id] || {};

    return hiddenColumnNames || ['data', 'createdBy', 'createdAt'];
  };

  onHiddenColumnNamesChange = (hiddenColumnNames) => {
    const { selectedKey } = this.props;

    if (!selectedKey) {
      return [];
    }

    const registryTableSettings = JSON.parse(storage.getItem('registryTableSettings') || '{}');

    registryTableSettings[selectedKey.id] = {
      ...(registryTableSettings[selectedKey.id] || {}),
      hiddenColumnNames
    };

    storage.setItem('registryTableSettings', JSON.stringify(registryTableSettings || {}));
  };

  propsToState = (defaultProps, { selectedKey }) => {
    if (!selectedKey || !selectedKey.schema) {
      return defaultProps;
    }

    let customColumns = [];

    if (typeof selectedKey.schema.toTable === 'object') {
      customColumns = Object.keys(selectedKey.schema.toTable);
    } else {
      customColumns = Object.keys(selectedKey.schema.properties || {});
    }

    const registryTableSettings = JSON.parse(storage.getItem('registryTableSettings') || '{}');
    const { columnWidths, columnOrder } = registryTableSettings[selectedKey.id] || {};

    const filteredColumnWidths =
      columnWidths &&
      columnWidths.filter(
        ({ columnName }) =>
          customColumns.includes(columnName.replace('data.', '')) ||
          defaultProps?.columnWidths
            .map(({ columnName: defaultColumnName }) => defaultColumnName)
            .includes(columnName)
      );

    return {
      columns: [
        ...defaultProps.columns,
        ...customColumns.map((propertyName) => ({
          name: ['data', propertyName].join('.'),
          title: (selectedKey.schema.properties[propertyName] || {}).description || propertyName,
          hidden: !!(selectedKey.schema.properties[propertyName] || {}).hidden,
          sortingEnabled: !(selectedKey.schema.properties[propertyName] || {}).disableSort,
          dateFormat: (selectedKey.schema.properties[propertyName] || {}).dateFormat,
          control: (selectedKey.schema.properties[propertyName] || {}).control,
          editingEnabled: (selectedKey.schema.properties[propertyName] || {}).editingEnabled,
          propertyName
        }))
      ],
      tableColumnExtensions: defaultProps.tableColumnExtensions,
      columnWidths: filteredColumnWidths || [
        ...defaultProps.columnWidths,
        ...customColumns.map((propertyName) => ({
          columnName: ['data', propertyName].join('.'),
          width: 240
        }))
      ],
      columnOrder: columnOrder || [...defaultProps.columnOrder, ...customColumns],
      customColumns: customColumns.map((propertyName) => ['data', propertyName].join('.'))
    };
  };

  columnsToggleButton = ({ onToggle, buttonRef, getMessage }) => (
    <Tooltip title={getMessage('showColumnChooser')} placement="bottom" enterDelay={300}>
      <IconButton onClick={onToggle} buttonRef={buttonRef} size="large">
        <ViewColumnIcon />
      </IconButton>
    </Tooltip>
  );

  onChangePageInput = (page) => {
    if (!page || !page.length) return;

    clearTimeout(this.onChangePageTimeout);

    this.onChangePageTimeout = setTimeout(() => {
      this.onCurrentPageChange(Number(page - 1));
    }, 500);
  };

  onCurrentPageChange = (newPage) => {
    const { actions } = this.props;
    actions.onChangePage(newPage, true, false);
  };

  onPageSizeChange = (perPage) => {
    const { actions } = this.props;
    actions.onChangeRowsPerPage(perPage, true, false);
  };

  addUnExisted = (columns, columnWidths) =>
    (columns || []).map(({ name }) => {
      const exists = (columnWidths || []).find(({ columnName }) => columnName === name);
      if (exists) return exists;
      return {
        columnName: name,
        width: 240
      };
    });

  renderPagination = () => {
    const { t, data, rowsPerPage, page, count, classes, selectedKey } = this.props;

    const lastPageValue = Math.ceil(count / rowsPerPage);
    const isLastPage = lastPageValue === page + 1;
    const isFirstPage = page === 0;

    return (
      <div className={classes.actionsWrapper}>
        <div className={classes.perPageWrapper}>
          {(selectedKey ? [10, 50, 100] : []).map((item) => (
            <IconButton
              key={item}
              className={classNames(
                classes.perPageitem,
                rowsPerPage === item ? classes.perPageitemActive : null
              )}
              onClick={() => this.onPageSizeChange(item)}
              size="large"
            >
              {item}
            </IconButton>
          ))}
        </div>

        <div className={classes.paginationItems}>
          <div
            className={classNames(classes.paginationItems, isFirstPage ? classes.disabled : null)}
            onClick={() => this.onCurrentPageChange(0)}
          >
            <KeyboardTabIcon className={classes.rotateItem} />
            <span className={classes.hideOnXs}>{t('FirstPage')}</span>
          </div>

          <div
            className={classNames(classes.paginationItems, isFirstPage ? classes.disabled : null)}
            onClick={() => this.onCurrentPageChange(page - 1)}
          >
            <ArrowBackIcon />
            <span className={classes.hideOnXs}>{t('Backward')}</span>
          </div>

          <div className={classNames(classes.paginationItems, classes.initialCursor)}>
            <StringElement
              width={30}
              value={page + 1}
              fullWidth={true}
              required={true}
              noMargin={true}
              className={classes.pageInput}
              onChange={this.onChangePageInput}
            />
            {t('From')} <span className={classes.lastPageValueWrapper}>{lastPageValue}</span>
          </div>

          <div
            className={classNames(classes.paginationItems, isLastPage ? classes.disabled : null)}
            onClick={() => this.onCurrentPageChange(page + 1)}
          >
            <span className={classes.hideOnXs}>{t('Forward')}</span>
            <ArrowForwardIcon />
          </div>

          <div
            className={classNames(classes.paginationItems, isLastPage ? classes.disabled : null)}
            onClick={() => this.onCurrentPageChange(lastPageValue - 1)}
          >
            <span className={classes.hideOnXs}>{t('LastPage')}</span>
            <KeyboardTabIcon />
          </div>
        </div>

        <div className={classes.paginationState}>
          {page * rowsPerPage + 1}
          {' - '}
          {page * rowsPerPage + (data || []).length} {t('From')} {count}
        </div>
      </div>
    );
  };

  renderTableCell = ({ row: rowOrigin, column }) => {
    const {
      selectedKey,
      filters: { name: search }
    } = this.props;

    const row = rowOrigin.data || rowOrigin;

    let text;

    if (typeof selectedKey.schema.toTable === 'object') {
      text = evaluate(selectedKey.schema.toTable[column.title], row);
    } else {
      text = objectPath.get(row, column.name);
    }

    if (text instanceof Error) {
      text = evaluate(selectedKey.schema.toTable[column.propertyName], row);
    }

    if (column?.control === 'file') {
      return (
        <>
          {[].concat(text).map((file) => (
            <DirectPreview key={file?.url} url={file?.url} />
          ))}
        </>
      );
    }

    const columnType = selectedKey.schema?.properties[column?.propertyName]?.type;

    let displayText = typeof text === 'object' ? JSON.stringify(text) : text;

    displayText = columnType === 'boolean' ? JSON.stringify(!!displayText) : displayText;

    if (column?.dateFormat) {
      displayText = moment(displayText).format(column?.dateFormat);
    }

    return <HighlightText highlight={search} text={displayText} />;
  };

  deleteHiddenColumns = (array) => array.filter((item) => !item.hidden);

  setColumnOrder = (columnOrder) => this.setState({ columnOrder });

  setColumnWidths = (columnWidths) => this.setState({ columnWidths });

  renderGrid() {
    const { columns, tableColumnExtensions, columnWidths, columnOrder, customColumns, error } =
      this.state;
    const { t, data, selectedKey, rowsPerPage, page, loading, count, actions } = this.props;

    const tableMessages = { noData: t('NoData') };
    const tableData = selectedKey ? data : [];
    const columnChooserMessages = {
      showColumnChooser: t('ChooseColumns')
    };

    if (loading) {
      return <Preloader />;
    }

    if (error) {
      return <ErrorScreen error={error} />;
    }
    return (
      <Grid
        rows={Array.isArray(tableData) ? tableData : []}
        columns={this.deleteHiddenColumns(columns) || []}
      >
        <DataTypeProvider
          for={['createdAt']}
          formatterComponent={({ row }) =>
            row.createdAt ? <TimeLabel date={row.createdAt} /> : null
          }
        />

        <DataTypeProvider
          for={['updatedAt']}
          formatterComponent={({ row }) =>
            row.updatedAt ? <TimeLabel date={row.updatedAt} /> : null
          }
        />
        <DataTypeProvider for={['operation']} formatterComponent={({ row }) => t(row.operation)} />

        <DataTypeProvider
          for={['data']}
          formatterComponent={({ row }) => {
            if (!selectedKey) {
              return null;
            }

            const content = evaluate(selectedKey.toString, row);

            if (content instanceof Error) {
              content.commit({
                type: 'registry',
                selectedKey
              });

              return null;
            }

            return content || null;
          }}
        />

        <DataTypeProvider
          for={['person']}
          formatterComponent={({ row }) =>
            (row && row.person && (row.person.name || row.person.personName)) || ''
          }
        />

        <DataTypeProvider
          for={['meta.person.id']}
          formatterComponent={({ row }) => {
            return row?.data?.meta?.person?.id || null;
          }}
        />

        <DataTypeProvider
          for={['meta.person.name']}
          formatterComponent={({ row }) => {
            return row?.data?.meta?.person?.name || null;
          }}
        />
        <DataTypeProvider
          key={customColumns}
          for={customColumns}
          formatterComponent={this.renderTableCell}
        />
        <SearchState />
        <PagingState
          currentPage={page}
          onCurrentPageChange={(newPage) => actions.onChangePage(newPage)}
          pageSize={rowsPerPage}
          onPageSizeChange={actions.onChangeRowsPerPage}
        />
        <CustomPaging totalCount={count || 0} />
        <DragDropProvider />
        <Table
          messages={tableMessages}
          columnExtensions={tableColumnExtensions}
          rowComponent={TableRow((record) => this.setState({ selectedRecord: record }))}
        />
        <TableColumnReordering order={columnOrder} onOrderChange={this.setColumnOrder} />
        <TableColumnResizing
          columnWidths={this.addUnExisted(columns, columnWidths)}
          onColumnWidthsChange={this.setColumnWidths}
        />
        <TableHeaderRow showSortingControls={false} />
        <TableColumnVisibility
          defaultHiddenColumnNames={this.hiddenColumnsNames()}
          onHiddenColumnNamesChange={this.onHiddenColumnNamesChange}
        />
        <Toolbar />
        <ColumnChooser
          messages={columnChooserMessages}
          toggleButtonComponent={this.columnsToggleButton}
        />
      </Grid>
    );
  }

  render() {
    const { selectedRecord } = this.state;
    const { selectedKey, disableElevation } = this.props;

    return (
      <Paper elevation={disableElevation ? 0 : 1}>
        {this.renderGrid()}
        {this.renderPagination()}
        {selectedRecord ? (
          <RegistryModal
            open={!!(selectedKey && selectedRecord)}
            selected={selectedKey || {}}
            value={(selectedRecord && selectedRecord.data) || {}}
            handleClose={() => this.setState({ selectedRecord: null })}
          />
        ) : null}
      </Paper>
    );
  }
}

const styled = withStyles(styles)(RegistryHistoryTable);

const translated = translate('RegistryPage')(styled);

export default dataTableConnect(endPoint)(translated);
