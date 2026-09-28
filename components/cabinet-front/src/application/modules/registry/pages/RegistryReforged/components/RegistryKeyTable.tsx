import React from 'react';
import qs from 'qs';
import { useTranslate } from 'react-translate';
import cleanDeep from 'clean-deep';
import { history } from 'store';

import endPoint from 'application/endPoints/registryRecord';
import dataTableConnect from 'services/dataTable/connect';
import DataGridRaw from 'components/DataGridPremium';
import CreateNewRecordButtonRaw from './CreateNewRecordButton';
import ExportToExcelButtonRaw from './ExportToExcelButton';
import ColumnFilterInput from './ColumnFilterInput';
import RegistryModalRaw from './RegistryModal';
import propsToStateHelper from './propsToState';
import renderTableCellHelper from './renderTableCell';
import controls from 'components/DataGridPremium/components/defaultProps';

const DataGrid = DataGridRaw as unknown as React.ComponentType<Record<string, unknown>>;
const CreateNewRecordButton = CreateNewRecordButtonRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ExportToExcelButton = ExportToExcelButtonRaw as unknown as React.ComponentType<Record<string, unknown>>;
const RegistryModal = RegistryModalRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface SelectedKey {
  id?: string | number;
  registerId?: string | number;
  access?: { allowCreate?: boolean };
  schema?: Record<string, unknown>;
}

interface RecordRow {
  id?: string | number;
  registerId?: string | number;
  keyId?: string | number;
  data?: unknown;
  [key: string]: unknown;
}

interface Filters {
  name?: string;
  keyId?: string | number;
  searchKeys?: { columnName: string; value: unknown; operation: string }[];
  [key: string]: unknown;
}

interface RegistryKeyTableProps {
  loading?: boolean;
  selectedKey?: SelectedKey;
  data?: RecordRow[];
  actions: {
    clearFilters: () => Promise<unknown>;
    onFilterChange: (params: Record<string, unknown>, force?: boolean) => Promise<unknown>;
    load: () => Promise<unknown>;
    storeRecord: (id: string | number, record: RecordRow) => Promise<unknown>;
    createRecord: (record: RecordRow) => Promise<unknown>;
    setDefaultData: (params: Record<string, unknown>) => void;
    onRowsDelete: (ids: (string | number)[]) => void;
  };
  filters: Filters;
  page: number;
  rowsPerPage: number;
  count?: number;
  [key: string]: unknown;
}

const RegistryKeyTable = (props: RegistryKeyTableProps) => {
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

  const [newRecord, setNewRecord] = React.useState<RecordRow | null>(null);
  const [columns, setColumns] = React.useState<Record<string, unknown>[]>([]);
  const [selectedRecord, setSelectedRecord] = React.useState<RecordRow | null>(null);
  const [hiddenColumns, setHiddenColumns] = React.useState<Record<string, boolean>>({});

  const t = useTranslate('RegistryPage');

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

  const CustomToolbar = React.useCallback(
    () => (
      <>
        <ExportToExcelButton
          selectedKey={selectedKey}
          count={props.count}
          columns={columns.filter((item) => !item.hidden)}
          dataLikeFilters={filters?.searchKeys?.reduce((acc: Record<string, unknown>, { columnName, value }) => {
            const key = columnName.includes('.') ? columnName.split('.')[1] : columnName;
            return {
              ...acc,
              [key]: value
            };
          }, {})}
        />
        {!selectedKey || !selectedKey.access?.allowCreate ? null : (
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
    async (record: RecordRow) => {
      setSelectedRecord(record);
      await actions.storeRecord(record.id as string | number, record);
      await actions.load();
    },
    [actions]
  );

  const handleStoreNewRecord = React.useCallback(
    async (record: RecordRow) => {
      await actions.createRecord(record);
      await actions.load();
      setNewRecord(null);
    },
    [actions]
  );

  const handleEditRecord = React.useCallback(({ row }: { row: RecordRow }) => {
    setSelectedRecord(row);
  }, []);

  const renderTableCell = React.useCallback(
    ({ row, column }: { row: unknown; column: Record<string, unknown> }) => {
      const text = renderTableCellHelper({
        row: row as Record<string, unknown>,
        column: column as never,
        selectedKey: selectedKey as never,
        search
      });

      return text;
    },
    [selectedKey, search]
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
      renderHeaderFilter: renderHeaderFilter as never
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

  const onColumnVisibilityCallback = React.useCallback((model: Record<string, boolean>) => {
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
    setColumns(cleanDeep(columns as never) as Record<string, unknown>[]);
    if (filters.searchKeys) return;
    setHiddenColumns(defaultHiddenColumns as Record<string, boolean>);
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
          handleDelete={actions.onRowsDelete.bind(null, [(selectedRecord || {}).id as string | number])}
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

export default dataTableConnect(endPoint as never)(RegistryKeyTable as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
