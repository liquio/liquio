import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { Switch } from '@mui/material';

import LeftSidebarLayout from 'layouts/LeftSidebar';
import DataTableRaw from 'components/DataTable';
import * as api from 'services/api';
import useTable from 'services/dataTable/useTable';
import asModulePage from 'hooks/asModulePage';
import NewUiFilter from './components/NewUiFilter';
import EditUiFilter from './components/EditUiFilter';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UiFilter {
  id: string;
  isActive?: boolean;
  filter?: string;
  name?: string;
}

interface FilterListProps {
  t: (key: string) => string;
  title?: string;
  location?: unknown;
  actions: {
    createFilter: (filter: UiFilter) => Promise<unknown>;
    updateFilter: (filterId: string, filter: UiFilter) => Promise<unknown>;
    deleteFilter: (filterId: string) => Promise<unknown>;
  };
}

const FilterList = ({ t, title, location, actions }: FilterListProps) => {
  const tableProps = useTable({
    dataURL: 'ui-filters',
    sourceName: 'ui-filters',
    autoLoad: true
  });

  const toggleIsActive = React.useCallback(
    (rowData: UiFilter, rowIndex: number) =>
      async ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
        const newRowData = { ...rowData, isActive: checked };
        tableProps.actions.onRowUpdate(rowIndex, newRowData);

        await actions.updateFilter(rowData.id, newRowData);
      },
    [actions, tableProps.actions]
  );

  const createNewUiFilter = async (filter: UiFilter) => {
    await actions.createFilter(filter);
    tableProps.actions.load();
  };

  const editUiFilter = React.useCallback(
    (filter: UiFilter) => {
      const rowIndex = (tableProps.data as UiFilter[]).findIndex(({ id }) => id === filter.id);
      tableProps.actions.onRowUpdate(rowIndex, filter);
      actions.updateFilter(filter.id, filter);
    },
    [actions, tableProps.actions, tableProps.data]
  );

  const deleteUiFilter = React.useCallback(
    async (filter: UiFilter) => {
      await actions.deleteFilter(filter.id);
      tableProps.actions.load();
    },
    [actions, tableProps.actions]
  );

  return (
    <LeftSidebarLayout location={location as never} title={t(title as string)} loading={tableProps.loading as boolean}>
      <DataTable
        {...tableProps}
        CustomToolbar={() => <NewUiFilter onCommit={createNewUiFilter} />}
        darkTheme={true}
        columns={[
          {
            id: 'isActive',
            padding: 'checkbox',
            width: 40,
            render: (isActive: boolean, rowData: UiFilter, columnKey: unknown, rowIndex: number) => (
              <Switch
                checked={isActive}
                onChange={toggleIsActive(rowData, rowIndex)}
                color="primary"
              />
            )
          },
          {
            id: 'name'
          },
          {
            id: 'edit',
            padding: 'checkbox',
            align: 'right',
            width: 40,
            render: (edit: unknown, row: UiFilter) => (
              <EditUiFilter value={row} onCommit={editUiFilter as never} onDelete={deleteUiFilter} />
            )
          }
        ]}
        controls={{
          pagination: true,
          toolbar: true,
          search: true,
          header: false,
          refresh: true,
          switchView: false,
          customizateColumns: false
        }}
      />
    </LeftSidebarLayout>
  );
};

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    createFilter: (filterData: UiFilter) =>
      api.post('ui-filters', filterData, 'CREATE_UI_FILTER', dispatch as never, filterData),
    updateFilter: (filterId: string, filterData: UiFilter) =>
      api.put(`ui-filters/${filterId}`, filterData, 'UPDATE_UI_FILTER', dispatch as never, { filterId }),
    deleteFilter: (filterId: string) =>
      api.del(`ui-filters/${filterId}`, {}, 'DELETE_UI_FILTER', dispatch as never, {
        filterId
      })
  }
});

const translated = translate('UIFilterList')(FilterList as never);
const moduled = asModulePage(translated as never);
export default connect(null, mapDispatch)(moduled as never);
