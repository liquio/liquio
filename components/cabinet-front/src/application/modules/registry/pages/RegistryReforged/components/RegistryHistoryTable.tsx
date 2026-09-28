import React from 'react';
import { useTranslate } from 'react-translate';

import endPoint from 'application/endPoints/registryHistory';
import dataTableConnect from 'services/dataTable/connect';
import DataGridRaw from 'components/DataGridPremium';
import RestoreRecordButtonRaw from './RestoreRecordButton';
import RegistryModalRaw from './RegistryModal';
import propsToStateHelper from './propsToState';
import renderTableCellHelper from './renderTableCell';
import ColumnFilterInput from './ColumnFilterInput';
import controls from 'components/DataGridPremium/components/defaultProps';

const DataGrid = DataGridRaw as unknown as React.ComponentType<Record<string, unknown>>;
const RestoreRecordButton = RestoreRecordButtonRaw as unknown as React.ComponentType<Record<string, unknown>>;
const RegistryModal = RegistryModalRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface RecordRow {
  id?: string | number;
  data?: unknown;
  [key: string]: unknown;
}

interface Filters {
  name?: string;
  searchKeys?: { columnName: string; value: unknown; operation: string }[];
  [key: string]: unknown;
}

interface RegistryHistoryTableProps {
  selectedKey?: { id?: string | number; schema?: Record<string, unknown> } | null;
  actions: {
    clearFilters: () => Promise<unknown>;
    onFilterChange: (params: Record<string, unknown>, force?: boolean) => Promise<unknown>;
    load: () => Promise<unknown>;
  };
  loading?: boolean;
  data?: RecordRow[];
  filters: Filters;
  [key: string]: unknown;
}

const RegistryHistoryTable = (props: RegistryHistoryTableProps) => {
  const {
    selectedKey,
    actions,
    loading,
    data,
    filters,
    filters: { name: search }
  } = React.useMemo(() => props, [props]);

  const t = useTranslate('RegistryPage');
  const [selectedRecord, setSelectedRecord] = React.useState<RecordRow | null>(null);
  const [columns, setColumns] = React.useState<Record<string, unknown>[]>([]);
  const [hiddenColumns, setHiddenColumns] = React.useState<Record<string, boolean>>({});
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
    ({ row }: { row: RecordRow }) => {
      setSelectedRecord(row);
    },
    [setSelectedRecord]
  );

  const CustomToolbar = React.useCallback(() => {
    return <RestoreRecordButton selectedKey={selectedKey} />;
  }, [selectedKey]);

  const renderTableCell = React.useCallback(
    ({ row, column }: { row: unknown; column: Record<string, unknown> }) => {
      const text = renderTableCellHelper({
        row: row as Record<string, unknown>,
        column: column as never,
        selectedKey: selectedKey as never,
        search,
        isHistory: true
      });

      return text;
    },
    [selectedKey, search]
  );

  const handleChangeFilter = React.useCallback(
    (name: string, value: unknown) => {
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

      clearTimeout(timeoutRef.current as ReturnType<typeof setTimeout>);

      timeoutRef.current = setTimeout(async () => {
        await actions.load();
      }, 1000);
    },
    [actions, filters]
  );

  const renderHeaderFilter = React.useCallback(
    (column: { field?: string }) => {
      const filterValue = filters.searchKeys?.find(
        (filter) => filter.columnName === column?.field
      )?.value;

      return (
        <ColumnFilterInput
          setFilter={(value) => handleChangeFilter(column?.field as string, value)}
          filterValue={filterValue as string}
        />
      );
    },
    [filters, handleChangeFilter]
  );

  const propsToState = React.useCallback(() => {
    const result = propsToStateHelper({
      t,
      selectedKey: selectedKey as never,
      renderTableCell,
      renderHeaderFilter: renderHeaderFilter as never,
      isHistory: true
    });

    return result;
  }, [selectedKey, t, renderTableCell, renderHeaderFilter]);

  React.useEffect(() => {
    const { columns, hiddenColumns } = propsToState();
    setColumns(columns as unknown as Record<string, unknown>[]);
    setHiddenColumns(hiddenColumns as Record<string, boolean>);
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

export default dataTableConnect(endPoint as never)(RegistryHistoryTable as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
