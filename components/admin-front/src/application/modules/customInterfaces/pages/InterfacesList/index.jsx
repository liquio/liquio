import React from 'react';
import { translate } from 'react-translate';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import DataTable from 'components/DataTable';
import * as api from 'services/api';
import useTable from 'services/dataTable/useTable';
import asModulePage from 'hooks/asModulePage';
import { connect } from 'react-redux';
import NewInterface from 'modules/customInterfaces/pages/InterfacesList/components/NewInterface';
import EditInterface from 'modules/customInterfaces/pages/InterfacesList/components/EditInterface';
import DeleteInterface from 'modules/customInterfaces/pages/InterfacesList/components/DeleteInterface';
import checkAccess from 'helpers/checkAccess';

const InterfacesList = ({
  t,
  title,
  location,
  actions,
  userInfo,
  userUnits,
}) => {
  const tableProps = useTable({
    dataURL: 'custom-interfaces',
    sourceName: 'custom-interfaces',
    autoLoad: true,
  });

  const createNewInterface = async (customInterface) => {
    await actions.createInterface(customInterface);
    tableProps.actions.load();
  };

  const editInterface = async (customInterface) => {
    const rowIndex = tableProps.data.findIndex(
      ({ id }) => id === customInterface.id,
    );
    await tableProps.actions.onRowUpdate(rowIndex, customInterface);
    await actions.updateInterface(customInterface.id, customInterface);
  };

  const deleteInterface = async (customInterface) => {
    await actions.deleteInterface(customInterface.id);
    tableProps.actions.load();
  };

  const isEditable = checkAccess(
    { userHasUnit: [1000002] },
    userInfo,
    userUnits,
  );

  return (
    <LeftSidebarLayout
      location={location}
      title={t(title)}
      loading={tableProps.loading}
    >
      <DataTable
        {...tableProps}
        CustomToolbar={() =>
          isEditable ? <NewInterface onCommit={createNewInterface} /> : null
        }
        darkTheme={true}
        columns={[
          {
            id: 'name',
            name: t('Name'),
          },
          {
            id: 'route',
            name: t('Route'),
          },
          {
            id: 'actions',
            padding: 'checkbox',
            width: 40,
            name: t('Actions'),
            render: (edit, row) => (
              <div style={{ display: 'flex' }} key={row?.id}>
                <EditInterface
                  value={row}
                  onCommit={editInterface}
                  readOnly={!isEditable}
                />
                <DeleteInterface
                  value={row}
                  onDelete={deleteInterface}
                  readOnly={!isEditable}
                />
              </div>
            ),
          },
        ]}
        controls={{
          pagination: true,
          toolbar: true,
          search: true,
          header: true,
          refresh: true,
          switchView: false,
          customizateColumns: false,
          bottomPagination: true,
        }}
      />
    </LeftSidebarLayout>
  );
};

const mapStateToProps = ({ auth: { info: userInfo, userUnits } }) => ({
  userInfo,
  userUnits,
});

const mapDispatch = (dispatch) => ({
  actions: {
    createInterface: (interfaceData) =>
      api.post(
        'custom-interfaces',
        interfaceData,
        'CREATE_INTERFACE',
        dispatch,
        interfaceData,
      ),
    updateInterface: (interfaceId, interfaceData) =>
      api.put(
        `custom-interfaces/${interfaceId}`,
        interfaceData,
        'UPDATE_INTERFACE',
        dispatch,
        { interfaceId },
      ),
    deleteInterface: (interfaceId) =>
      api.del(
        `custom-interfaces/${interfaceId}`,
        {},
        'DELETE_INTERFACE',
        dispatch,
        { interfaceId },
      ),
  },
});

const translated = translate('InterfacesList')(InterfacesList);
const moduled = asModulePage(translated);
export default connect(mapStateToProps, mapDispatch)(moduled);
