import React from 'react';
import { translate } from 'react-translate';
import objectPath from 'object-path';
import PropTypes from 'prop-types';
import { Paper, IconButton, Tooltip } from '@mui/material';
import moment from 'moment';
import classNames from 'classnames';
import qs from 'qs';

import {
  DataTypeProvider,
  CustomPaging,
  PagingState,
  SearchState,
  SortingState,
  IntegratedSorting,
  FilteringState
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
  TableColumnResizing,
  TableFilterRow
} from '@devexpress/dx-react-grid-material-ui';
import { connectProps } from '@devexpress/dx-react-core';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardTabIcon from '@mui/icons-material/KeyboardTab';
import TimeLabel from 'components/Label/Time';
import HighlightText from 'components/HighlightText';
import endPoint from 'application/endPoints/registryRecord';
import dataTableConnect from 'services/dataTable/connect';
import evaluate from 'helpers/evaluate';
import storage from 'helpers/storage';
import { connect } from 'react-redux';

import processList from 'services/processList';
import DirectPreview from 'components/FileDataTable/components/DirectPreview';
import InitialState from 'modules/registry/pages/Registry/components/TableColumns';
import StringElement from 'components/JsonSchema/elements/StringElement';
import ExportToExelButton from './ExportToExelButton';
import CreateNewRecordButton from './CreateNewRecordButton';
import RegistryModal from './RegistryModal';
import SortLabel from './SortLabel';
import FilterCell from './FilterCell';
import TableCell from './TableCell';
import SearchInput from './SearchInput';

class RegistryKeyTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.propsToState(InitialState(props.t), props);
    this.searchInput = connectProps(SearchInput, () => {
      const { useSearch } = this.state;
      return { useSearch };
    });
    this.filterCell = connectProps(FilterCell, () => {
      const { useSearch } = this.state;
      return { useSearch };
    });
  }

  hiddenColumnsNames = () => {
    const { selectedKey } = this.props;

    if (!selectedKey) {
      return [];
    }

    const registryTableSettings = JSON.parse(storage.getItem('registryTableSettings') || '{}');
    const { hiddenColumnNames } = registryTableSettings[selectedKey.id] || {};

    return (
      hiddenColumnNames || ['data', 'createdBy', 'meta.person.id', 'meta.person.name', 'createdAt']
    );
  };

  setTableSettings = (settings) => {
    const { selectedKey } = this.props;

    if (!selectedKey) {
      return;
    }

    const registryTableSettings = JSON.parse(storage.getItem('registryTableSettings') || '{}');

    registryTableSettings[selectedKey.id] = {
      ...(registryTableSettings[selectedKey.id] || {}),
      ...settings
    };

    storage.setItem('registryTableSettings', JSON.stringify(registryTableSettings || {}));
    this.setState(settings);
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

  deleteHiddenColumns = (array) => array.filter((item) => !item.hidden);

  setColumnOrder = (columnOrder) => this.setTableSettings({ columnOrder });

  onHiddenColumnNamesChange = (hiddenColumnNames) => this.setTableSettings({ hiddenColumnNames });

  setColumnWidths = (columnWidths) => this.setTableSettings({ columnWidths });

  handleStore = async (record) => {
    const { actions } = this.props;
    this.setState({ selectedRecord: record });
    await actions.storeRecord(record.id, record);
    await actions.load();
  };

  handleStoreNewRecord = async (newRecord) => {
    const { actions } = this.props;
    await actions.createRecord(newRecord);
    await actions.load();
    this.setState({ newRecord: null });
  };

  getSorting = () => {
    const { sort } = this.props;

    return Object.keys(sort).map((columnName) => ({
      columnName,
      direction: sort[columnName]
    }));
  };

  setSorting = ([sorting]) => {
    if (!sorting) return;
    const { actions } = this.props;
    actions.onColumnSortChange(sorting.columnName, sorting.direction, true, true);
  };

  setFilters = (filters) => {
    if (!filters) return;
    const {
      actions,
      filters: { name: search }
    } = this.props;
    actions.onSearchChange(search, false, filters);

    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      actions.load();
    }, 1000);
  };

  setSearchVisible = () => {
    const { useSearch, savedFirstElement } = this.state;
    const { data, selectedKey } = this.props;

    const { toSearchString } = selectedKey || {};
    const [firstElement] = Array.isArray(data) ? data : [];
    const useSearchUpdate =
      toSearchString && savedFirstElement && evaluate(toSearchString, savedFirstElement) !== null;

    const updateFirstElement =
      firstElement && JSON.stringify(firstElement) !== JSON.stringify(savedFirstElement);

    if (updateFirstElement) {
      this.setState({ savedFirstElement: firstElement });
    }

    if (useSearch !== useSearchUpdate) {
      this.setState({
        useSearch: useSearchUpdate
      });
    }
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

  renderTableCell = ({ row, column }) => {
    const {
      selectedKey,
      filters: { name: search }
    } = this.props;

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

  saveFilters = ({ perPage, newPage }) => {
    const {
      history,
      rowsPerPage,
      page,
      filters: { keyId }
    } = this.props;

    const savedPerPage = perPage || rowsPerPage;
    const savedPage = Number(newPage || page) + 1;

    const searchParams = `/registry?keyId=${keyId}&page=${savedPage}&rowsPerPage=${Number(
      savedPerPage
    )}`;

    history.push(searchParams);
  };

  onCurrentPageChange = (newPage) => {
    const { actions } = this.props;
    actions.onChangePage(newPage - 1);
    this.saveFilters({
      newPage: newPage + ''
    });
  };

  onPageSizeChange = (perPage) => {
    const { actions } = this.props;
    actions.onChangeRowsPerPage(perPage);
    this.saveFilters({
      perPage: perPage + '',
      newPage: '0'
    });
  };

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

  renderGrid = () => {
    const { columns, tableColumnExtensions, columnWidths, columnOrder, customColumns } = this.state;
    const {
      t,
      data,
      selectedKey,
      rowsPerPage,
      page,
      count,
      actions,
      filters: { name: search, searchKeys }
    } = this.props;

    const tableMessages = { noData: t('NoData') };
    const tableData = selectedKey ? data : [];
    const columnChooserMessages = { showColumnChooser: t('ChooseColumns') };

    this.setSearchVisible();

    const sortingStateColumnExtensions = (columns || []).map(({ name, sortingEnabled }) => ({
      columnName: name,
      sortingEnabled: !!sortingEnabled
    }));

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

        <DataTypeProvider
          for={['meta.person.id']}
          formatterComponent={({ row }) => (row?.meta?.person?.id ? row.meta.person.id : null)}
        />

        <DataTypeProvider
          for={['meta.person.name']}
          formatterComponent={({ row }) => (row?.meta?.person?.name ? row.meta.person.name : null)}
        />

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
          key={customColumns}
          for={customColumns}
          formatterComponent={this.renderTableCell}
        />
        <FilteringState filters={searchKeys || []} onFiltersChange={this.setFilters} />
        <SortingState
          sorting={this.getSorting()}
          onSortingChange={this.setSorting}
          columnExtensions={sortingStateColumnExtensions}
        />
        <SearchState
          value={search}
          onValueChange={() => {
            clearTimeout(this.searchDelay);
            this.searchDelay = setTimeout(() => {
              actions.onSearchChange();
            }, 300);
          }}
        />

        <PagingState
          currentPage={page}
          onCurrentPageChange={(newPage) => actions.onChangePage(newPage - 1)}
          pageSize={rowsPerPage}
          onPageSizeChange={actions.onChangeRowsPerPage}
        />

        <CustomPaging totalCount={selectedKey && count ? count : 0} />

        <IntegratedSorting />

        <DragDropProvider />

        <Table
          messages={tableMessages}
          columnExtensions={tableColumnExtensions}
          cellComponent={TableCell((record) => this.setState({ selectedRecord: record }))}
        />

        <TableFilterRow
          showFilterSelector={false}
          messages={{ filterPlaceholder: t('SearchFieldLabel') }}
          cellComponent={this.filterCell}
        />

        <TableColumnReordering order={columnOrder} onOrderChange={this.setColumnOrder} />

        <TableColumnResizing
          columnWidths={this.addUnExisted(columns, columnWidths)}
          onColumnWidthsChange={this.setColumnWidths}
        />

        <TableHeaderRow showSortingControls={true} sortLabelComponent={SortLabel} />

        <TableColumnVisibility
          hiddenColumnNames={this.hiddenColumnsNames()}
          onHiddenColumnNamesChange={this.onHiddenColumnNamesChange}
        />

        <Toolbar />

        <ColumnChooser
          messages={columnChooserMessages}
          toggleButtonComponent={this.columnsToggleButton}
        />

        <ExportToExelButton
          selectedKey={selectedKey}
          columns={this.deleteHiddenColumns(columns) || []}
          count={count}
        />

        <CreateNewRecordButton
          disabled={!selectedKey || !selectedKey.access.allowCreate}
          onClick={() =>
            this.setState({
              newRecord: {
                registerId: selectedKey.registerId,
                keyId: selectedKey.id,
                data: {}
              }
            })
          }
        />
      </Grid>
    );
  };

  setFiltersFromUrl = () => {
    const { history, actions, authUnits } = this.props;
    const { search } = history.location;

    if (!search) return;

    const { rowsPerPage, page, redirectUrl, keyId, recordId } = qs.parse(search.replace('?', ''));
    if (recordId) {
      this.fetchData(recordId, keyId).then((record) => {
        const allowTokens = record.allowTokens.map((token) => parseInt(token, 10));
        const isAllowed = authUnits.some((unit) => allowTokens.includes(unit.id));

        if (isAllowed) {
          this.setState(recordId ? { recordId: recordId, selectedRecord: record } : null);
          this.setState({ redirectUrl: redirectUrl });
        }
      });
    }

    if (!rowsPerPage && !page) return;

    actions.setDefaultData({
      rowsPerPage: Number(rowsPerPage),
      page: Number(page) - 1
    });
  };

  init = () => {
    const { actions, selectedKey } = this.props;
    if (
      selectedKey &&
      !processList.has(
        'RegistryKeysTableLoad',
        actions.onFilterChange,
        { keyId: selectedKey.id },
        true
      )
    ) {
      actions.clearFilters();
      processList.set(
        'RegistryKeysTableLoad',
        actions.onFilterChange,
        { keyId: selectedKey.id },
        true
      );
    }
  };

  componentDidMount = () => {
    this.init();
    this.setFiltersFromUrl();
  };

  componentDidUpdate = () => {
    const {
      filters: { keyId },
      selectedKey
    } = this.props;
    if (selectedKey && keyId !== selectedKey.id) this.init();
    this.searchInput.update();
    this.filterCell.update();
  };

  componentWillReceiveProps = (nextProps) => {
    const defaultProps = InitialState(nextProps.t);
    this.setState(this.propsToState(defaultProps, nextProps), this.forceUpdate);
  };

  render = () => {
    const { selectedRecord, newRecord, recordId, redirectUrl } = this.state;
    const { selectedKey, actions, history } = this.props;

    return (
      <Paper>
        {this.renderGrid()}
        {this.renderPagination()}
        {selectedRecord ? (
          <RegistryModal
            open={!!(selectedKey && selectedRecord)}
            selected={selectedKey || {}}
            value={selectedRecord || {}}
            recordId={!!recordId}
            history={history}
            redirectUrl={redirectUrl}
            handleSave={this.handleStore}
            handleClose={() => this.setState({ selectedRecord: null })}
            handleDelete={actions.onRowsDelete.bind(null, [(selectedRecord || {}).id])}
          />
        ) : null}
        {newRecord ? (
          <RegistryModal
            editMode={true}
            open={true}
            selected={selectedKey || {}}
            value={newRecord || {}}
            handleClose={() => this.setState({ newRecord: null })}
            handleSave={this.handleStoreNewRecord}
          />
        ) : null}
      </Paper>
    );
  };
}

RegistryKeyTable.propTypes = {
  filters: PropTypes.object,
  selectedKey: PropTypes.object,
  actions: PropTypes.object,
  t: PropTypes.func.isRequired,
  data: PropTypes.array
};

RegistryKeyTable.defaultProps = {
  filters: {},
  selectedKey: {},
  actions: {},
  data: []
};

const mapStateToProps = (state) => ({
  authUnits: state.auth.units
});

const translated = translate('RegistryPage')(RegistryKeyTable);
export default connect(mapStateToProps)(dataTableConnect(endPoint)(translated));
