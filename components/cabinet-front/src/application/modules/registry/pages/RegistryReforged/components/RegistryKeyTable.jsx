import React from 'react';
import qs from 'qs';
import PropTypes from 'prop-types';
import { useTranslate } from 'react-translate';
import cleanDeep from 'clean-deep';
import { history } from 'store';

import endPoint from 'application/endPoints/registryRecord';
import dataTableConnect from 'services/dataTable/connect';
import DataGrid from 'components/DataGridPremium';
import CreateNewRecordButton from './CreateNewRecordButton';
import ExportToExcelButton from './ExportToExcelButton';
import ColumnFilterInput from './ColumnFilterInput';
import RegistryModal from './RegistryModal';
import propsToStateHelper from './propsToState';
import renderTableCellHelper from './renderTableCell';
import controls from 'components/DataGridPremium/components/defaultProps';

const RegistryKeyTable = (props) => {
  const {
    loading,
    selectedKey,
    data,
    actions,
    filters,
    filters: { name: search, keyId },
    page,
    rowsPerPage
  } = React.useMemo(() => props, [props]);

  const [newRecord, setNewRecord] = React.useState(null);
  const [columns, setColumns] = React.useState([]);
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [hiddenColumns, setHiddenColumns] = React.useState({});

  const t = useTranslate('RegistryPage');

  const timeoutRef = React.useRef(null);

  const init = React.useCallback(() => {
    if (!selectedKey) return;

    const fetchData = async () => {
      await actions.clearFilters();
      await actions.onFilterChange({
        keyId: selectedKey.id
      });
    };

    fetchData();
  }, [actions, selectedKey]);

  const handleChangeFilter = React.useCallback(
    (name, value) => {
      const searchKeys = filters.searchKeys || [];

      const updatedSearchKeys = searchKeys.filter((item) => item.columnName !== name);

      if (value) {
        updatedSearchKeys.push({
          columnName: name,
          value: value,
          operation: 'contains'
        });
      }

      actions.onFilterChange(
        {
          ...filters,
          searchKeys: updatedSearchKeys
        },
        false
      );

      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(async () => {
        await actions.load();
      }, 1000);
    },
    [actions, filters]
  );

  const CustomToolbar = React.useCallback(
    () => (
      <>
        <ExportToExcelButton
          selectedKey={selectedKey}
          count={props.count}
          columns={columns.filter((item) => !item.hidden)}
          dataLikeFilters={filters?.searchKeys?.reduce((acc, { columnName, value }) => {
            const key = columnName.includes('.') ? columnName.split('.')[1] : columnName;
            return {
              ...acc,
              [key]: value
            };
          }, {})}
        />
        {!selectedKey || !selectedKey.access.allowCreate ? null : (
          <CreateNewRecordButton
            onClick={() => {
              setNewRecord({
                registerId: selectedKey.registerId,
                keyId: selectedKey.id,
                data: {}
              });
            }}
          />
        )}
      </>
    ),
    [selectedKey, columns, filters, props.count]
  );

  const handleStore = React.useCallback(
    async (record) => {
      setSelectedRecord(record);
      await actions.storeRecord(record.id, record);
      await actions.load();
    },
    [actions]
  );

  const handleStoreNewRecord = React.useCallback(
    async (record) => {
      await actions.createRecord(record);
      await actions.load();
      setNewRecord(null);
    },
    [actions]
  );

  const handleEditRecord = React.useCallback(({ row }) => {
    setSelectedRecord(row);
  }, []);

  const renderTableCell = React.useCallback(
    ({ row, column }) => {
      const text = renderTableCellHelper({
        row,
        column,
        selectedKey,
        search
      });

      return text;
    },
    [selectedKey, search]
  );

  const renderHeaderFilter = React.useCallback(
    (column) => {
      const filterValue = filters.searchKeys?.find(
        (filter) => filter.columnName === column?.field
      )?.value;

      return (
        <ColumnFilterInput
          setFilter={(value) => handleChangeFilter(column?.field, value)}
          filterValue={filterValue}
        />
      );
    },
    [filters, handleChangeFilter]
  );

  const propsToState = React.useCallback(() => {
    const result = propsToStateHelper({
      t,
      selectedKey,
      renderTableCell,
      renderHeaderFilter
    });

    return result;
  }, [selectedKey, renderHeaderFilter, t, renderTableCell]);

  const saveFilters = React.useCallback(() => {
    history.push(`/registry?keyId=${keyId}&page=${page}&rowsPerPage=${Number(rowsPerPage)}`);
  }, [page, rowsPerPage, keyId]);

  const setFiltersFromUrl = React.useCallback(() => {
    const { search } = history.location;

    if (!search) return;

    const { rowsPerPage, page } = qs.parse(search.replace('?', ''));

    if (!rowsPerPage && !page) return;

    actions.setDefaultData({
      rowsPerPage: Number(rowsPerPage),
      page: Number(page) - 1
    });
  }, [actions]);

  const onColumnVisibilityCallback = React.useCallback((model) => {
    setHiddenColumns(model);
  }, []);

  React.useEffect(() => {
    init();
  }, [init]);

  React.useEffect(() => {
    setFiltersFromUrl();
  }, [setFiltersFromUrl]);

  React.useEffect(() => {
    const { columns, hiddenColumns: defaultHiddenColumns } = propsToState();
    setColumns(cleanDeep(columns));
    if (filters.searchKeys) return;
    setHiddenColumns(defaultHiddenColumns);
  }, [propsToState, filters.searchKeys]);

  React.useEffect(() => saveFilters());

  const filerHidden = React.useMemo(() => columns.filter((item) => !item.hidden), [columns]);

  return (
    <>
      <DataGrid
        loading={loading}
        columns={filerHidden}
        rows={data}
        controls={controls}
        checkable={false}
        onRowClick={handleEditRecord}
        unstableHeaderFilters={true}
        CustomToolbar={CustomToolbar}
        columnVisibilityModel={hiddenColumns}
        onColumnVisibilityCallback={onColumnVisibilityCallback}
        height={'100%'}
        showRowCount={true}
        {...props}
      />

      {selectedRecord ? (
        <RegistryModal
          open={!!(selectedKey && selectedRecord)}
          selected={selectedKey || {}}
          value={selectedRecord || {}}
          handleSave={handleStore}
          handleClose={() => setSelectedRecord(null)}
          handleDelete={actions.onRowsDelete.bind(null, [(selectedRecord || {}).id])}
        />
      ) : null}

      {newRecord ? (
        <RegistryModal
          editMode={true}
          open={true}
          selected={selectedKey || {}}
          value={newRecord || {}}
          handleClose={() => setNewRecord(null)}
          handleSave={handleStoreNewRecord}
        />
      ) : null}
    </>
  );
};

RegistryKeyTable.propTypes = {
  loading: PropTypes.bool,
  selectedKey: PropTypes.object,
  actions: PropTypes.object
};

RegistryKeyTable.defaultProps = {
  loading: false,
  selectedKey: {},
  actions: {}
};

export default dataTableConnect(endPoint)(RegistryKeyTable);
