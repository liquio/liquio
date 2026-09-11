import React from 'react';
import { useTranslate } from 'react-translate';

import endPoint from 'application/endPoints/registryHistory';
import dataTableConnect from 'services/dataTable/connect';
import DataGrid from 'components/DataGridPremium';
import RestoreRecordButton from './RestoreRecordButton';
import RegistryModal from './RegistryModal';
import propsToStateHelper from './propsToState';
import renderTableCellHelper from './renderTableCell';
import ColumnFilterInput from './ColumnFilterInput';
import controls from 'components/DataGridPremium/components/defaultProps';

const RegistryHistoryTable = (props) => {
  const {
    selectedKey,
    actions,
    loading,
    data,
    filters,
    filters: { name: search }
  } = React.useMemo(() => props, [props]);

  const t = useTranslate('RegistryPage');
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [columns, setColumns] = React.useState([]);
  const [hiddenColumns, setHiddenColumns] = React.useState({});
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

  const onRowClick = React.useCallback(
    ({ row }) => {
      setSelectedRecord(row);
    },
    [setSelectedRecord]
  );

  const CustomToolbar = React.useCallback(() => {
    return <RestoreRecordButton selectedKey={selectedKey} />;
  }, [selectedKey]);

  const renderTableCell = React.useCallback(
    ({ row, column }) => {
      const text = renderTableCellHelper({
        row,
        column,
        selectedKey,
        search,
        isHistory: true
      });

      return text;
    },
    [selectedKey, search]
  );

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
      renderHeaderFilter,
      isHistory: true
    });

    return result;
  }, [selectedKey, t, renderTableCell, renderHeaderFilter]);

  React.useEffect(() => {
    const { columns, hiddenColumns } = propsToState();
    setColumns(columns);
    setHiddenColumns(hiddenColumns);
  }, [propsToState]);

  React.useEffect(() => {
    init();
  }, [init]);

  const filerHidden = React.useMemo(() => columns.filter((item) => !item.hidden), [columns]);

  return (
    <>
      <DataGrid
        loading={loading}
        columns={filerHidden}
        rows={data}
        controls={{
          search: false,
          ...controls
        }}
        unstableHeaderFilters={false}
        checkable={false}
        onRowClick={onRowClick}
        columnVisibilityModel={hiddenColumns}
        CustomToolbar={CustomToolbar}
        height={'100%'}
        {...props}
      />

      {selectedRecord ? (
        <RegistryModal
          historyTab={true}
          open={!!(selectedKey && selectedRecord)}
          selected={selectedKey || {}}
          value={(selectedRecord && selectedRecord.data) || {}}
          selectedRecord={selectedRecord || {}}
          handleClose={() => setSelectedRecord(null)}
        />
      ) : null}
    </>
  );
};

export default dataTableConnect(endPoint)(RegistryHistoryTable);
