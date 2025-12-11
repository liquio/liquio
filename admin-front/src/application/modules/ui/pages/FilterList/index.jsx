import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { Switch } from '@mui/material';

import LeftSidebarLayout from 'layouts/LeftSidebar';
import DataTable from 'components/DataTable';
import * as api from 'services/api';
import useTable from 'services/dataTable/useTable';
import asModulePage from 'hooks/asModulePage';
import NewUiFilter from './components/NewUiFilter';
import EditUiFilter from './components/EditUiFilter';

const FilterList = ({ t, title, location, actions }) => {
  const tableProps = useTable({
    dataURL: 'ui-filters',
    sourceName: 'ui-filters',
    autoLoad: true
  });

  const toggleIsActive = React.useCallback(
    (rowData, rowIndex) =>
      async ({ target: { checked } }) => {
        const newRowData = { ...rowData, isActive: checked };
        tableProps.actions.onRowUpdate(rowIndex, newRowData);

        await actions.updateFilter(rowData.id, newRowData);
      },
    [actions, tableProps.actions]
  );

  const createNewUiFilter = async (filter) => {
    await actions.createFilter(filter);
    tableProps.actions.load();
  };

  const editUiFilter = React.useCallback(
    (filter) => {
      const rowIndex = tableProps.data.findIndex(({ id }) => id === filter.id);
      tableProps.actions.onRowUpdate(rowIndex, filter);
      actions.updateFilter(filter.id, filter);
    },
    [actions, tableProps.actions, tableProps.data]
  );

  const deleteUiFilter = React.useCallback(
    async (filter) => {
      await actions.deleteFilter(filter.id);
      tableProps.actions.load();
    },
    [actions, tableProps.actions]
  );

  return (
    <LeftSidebarLayout location={location} title={t(title)} loading={tableProps.loading}>
      <DataTable
        {...tableProps}
        CustomToolbar={() => <NewUiFilter onCommit={createNewUiFilter} />}
        darkTheme={true}
        columns={[
          {
            id: 'isActive',
            padding: 'checkbox',
            width: 40,
            render: (isActive, rowData, columnKey, rowIndex) => (
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
            render: (edit, row) => (
              <EditUiFilter value={row} onCommit={editUiFilter} onDelete={deleteUiFilter} />
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

const mapDispatch = (dispatch) => ({
  actions: {
    createFilter: (filterData) =>
      api.post('ui-filters', filterData, 'CREATE_UI_FILTER', dispatch, filterData),
    updateFilter: (filterId, filterData) =>
      api.put(`ui-filters/${filterId}`, filterData, 'UPDATE_UI_FILTER', dispatch, { filterId }),
    deleteFilter: (filterId) =>
      api.del(`ui-filters/${filterId}`, {}, 'DELETE_UI_FILTER', dispatch, {
        filterId
      })
  }
});

const translated = translate('UIFilterList')(FilterList);
const moduled = asModulePage(translated);
export default connect(null, mapDispatch)(moduled);
