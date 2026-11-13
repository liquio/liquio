import React from 'react';
import { translate } from 'react-translate';
import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import DataTableRaw from 'components/DataTable';
import * as api from 'services/api';
import useTable from 'services/dataTable/useTable';
import asModulePage from 'hooks/asModulePage';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import NewInterfaceRaw from 'modules/customInterfaces/pages/InterfacesList/components/NewInterface';
import EditInterfaceRaw from 'modules/customInterfaces/pages/InterfacesList/components/EditInterface';
import DeleteInterfaceRaw from 'modules/customInterfaces/pages/InterfacesList/components/DeleteInterface';
import checkAccess from 'helpers/checkAccess';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const NewInterface = NewInterfaceRaw as unknown as React.ComponentType<Record<string, unknown>>;
const EditInterface = EditInterfaceRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteInterface = DeleteInterfaceRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface InterfaceData {
  id?: string;
  name?: string;
  route?: string;
  [key: string]: unknown;
}

interface InterfacesListProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  title: string;
  location: unknown;
  actions: {
    createInterface: (data: InterfaceData) => Promise<unknown>;
    updateInterface: (id: string, data: InterfaceData) => Promise<unknown>;
    deleteInterface: (id: string) => Promise<unknown>;
  };
  userInfo: unknown;
  userUnits: unknown;
}

const InterfacesList = ({
  t,
  title,
  location,
  actions,
  userInfo,
  userUnits,
}: InterfacesListProps) => {
  const tableProps = useTable({
    dataURL: 'custom-interfaces',
    sourceName: 'custom-interfaces',
    autoLoad: true,
  } as never);

  const createNewInterface = async (customInterface: InterfaceData) => {
    await actions.createInterface(customInterface);
    (tableProps.actions as { load: () => void }).load();
  };

  const editInterface = async (customInterface: InterfaceData) => {
    const rowIndex = (tableProps.data as InterfaceData[]).findIndex(
      ({ id }) => id === customInterface.id,
    );
    await (tableProps.actions as unknown as { onRowUpdate: (index: number, data: InterfaceData) => Promise<void> }).onRowUpdate(rowIndex, customInterface);
    await actions.updateInterface(customInterface.id as string, customInterface);
  };

  const deleteInterface = async (customInterface: InterfaceData) => {
    await actions.deleteInterface(customInterface.id as string);
    (tableProps.actions as { load: () => void }).load();
  };

  const isEditable = checkAccess(
    { userHasUnit: [1000002] },
    userInfo as never,
    userUnits as never,
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
            render: (edit: unknown, row: InterfaceData) => (
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

const mapStateToProps = ({ auth: { info: userInfo, userUnits } }: { auth: { info: unknown; userUnits: unknown } }) => ({
  userInfo,
  userUnits,
});

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    createInterface: (interfaceData: InterfaceData) =>
      api.post(
        'custom-interfaces',
        interfaceData,
        'CREATE_INTERFACE',
        dispatch as never,
        interfaceData,
      ),
    updateInterface: (interfaceId: string, interfaceData: InterfaceData) =>
      api.put(
        `custom-interfaces/${interfaceId}`,
        interfaceData,
        'UPDATE_INTERFACE',
        dispatch as never,
        { interfaceId },
      ),
    deleteInterface: (interfaceId: string) =>
      api.del(
        `custom-interfaces/${interfaceId}`,
        {},
        'DELETE_INTERFACE',
        dispatch as never,
        { interfaceId },
      ),
  },
});

const translated = translate('InterfacesList')(InterfacesList as never);
const moduled = asModulePage(translated as never);
export default connect(mapStateToProps, mapDispatch)(moduled as never);
