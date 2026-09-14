import React from 'react';
import { translate } from 'react-translate';
import { useDispatch, connect } from 'react-redux';
import _ from 'lodash/fp';
import queue from 'queue';
import withStyles from '@mui/styles/withStyles';
import { Button } from '@mui/material';

import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import asModulePage from 'hooks/asModulePage';
import endPoint from 'application/endPoints/registryKeyList';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import DataTableRaw from 'components/DataTable';
import checkAccess from 'helpers/checkAccess';
import RenderOneLine from 'helpers/renderOneLine';
import { getSynchronizationCount } from 'actions/registry';
import CreateNewKeyRaw from './components/CreateNewKey';
import dataTableSettings from './variables/dataTableSettings';
import ImportRegisterKeysRaw from './components/KeyActions/ImportRegisterKeys';
import ImportRegistersKeysXLSRaw from './../RegistryList/components/ImportRegistersKeysXLS';
import ExportRegisterKeysRaw from './components/KeyActions/ExportRegisterKeys';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const CreateNewKey = CreateNewKeyRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ImportRegisterKeys = ImportRegisterKeysRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ImportRegistersKeysXLS = ImportRegistersKeysXLSRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ExportRegisterKeys = ExportRegisterKeysRaw as unknown as React.ComponentType<Record<string, unknown>>;

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    marginLeft: 10,
    '&:hover': {
      background: theme.listHover
    },
    '& svg': {
      fill: theme.buttonBg,
      marginRight: 10
    },
    '& img': {
      fill: theme.buttonBg,
      marginRight: 10
    }
  }
}))(Button) as unknown as React.ComponentType<Record<string, unknown>>;

const exportEnabledUnits = [1000002, 1000000042];

const toolbarStyle = {
  display: 'flex',
  justifyContent: 'end',
  alignItems: 'center',
  width: '100%'
};

interface KeyItem {
  id: string;
  [key: string]: unknown;
}

interface KeyListPageProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: {
    getRegister: (registerId: string) => Promise<{ name?: string }>;
    onFilterChange: (filters: Record<string, unknown>) => void;
    [key: string]: unknown;
  };
  registerId: string;
  title: string;
  loading?: boolean;
  location: unknown;
  userInfo: unknown;
  userUnits: { id: number }[];
  data?: KeyItem[];
  [key: string]: unknown;
}

const KeyListPage = (props: KeyListPageProps) => {
  const {
    t,
    actions,
    registerId,
    title,
    loading: loadingOrigin,
    location,
    userInfo,
    userUnits,
    data
  } = props;
  const [loading, setLoading] = React.useState(loadingOrigin);
  const [registerName, setRegisterName] = React.useState('');
  const [synchronizationCount, setSynchronizationCount] = React.useState<Record<string, unknown>>({});

  const queueFactory = React.useMemo(
    () =>
      queue({
        autostart: true,
        concurrency: 1
      }),
    []
  );

  const dispatch = useDispatch();

  React.useEffect(() => {
    const getRegisterDataAction = async () => {
      const registerName = (await actions.getRegister(registerId))?.name;
      setRegisterName(registerName || '');
    };

    actions.onFilterChange({ registerId });
    getRegisterDataAction();
  }, [actions, registerId]);

  React.useEffect(() => {
    const getSyncCount = () => {
      if (!data || !data.length) return;

      setLoading(true);

      const ids = data.map(({ id }) => id).join(',');

      queueFactory.push(async () => {
        const syncCount = (await dispatch(getSynchronizationCount(ids) as never)) as { key_id: string }[] | Error;
        if (syncCount instanceof Error) return;
        const transformedObject = ([] as { key_id: string }[]).concat(syncCount).reduce((acc: Record<string, unknown>, item) => {
          acc[item.key_id] = [item];
          return acc;
        }, {});
        setSynchronizationCount(transformedObject);
        setLoading(false);
      });
    };

    getSyncCount();
  }, [data, dispatch, queueFactory]);

  const isEditable = checkAccess({ userHasUnit: [1000002] }, userInfo as never, userUnits) as boolean;

  const mappedData = React.useMemo(() => {
    if (!data || !data.length) return [];

    return data.map((item) => ({
      ...item,
      sync: synchronizationCount[item.id]
    }));
  }, [data, synchronizationCount]);

  const handleUpdateStatus = React.useCallback(
    async (id: string) => {
      const result = (await dispatch(getSynchronizationCount(id) as never)) as unknown[] | Error;

      if (result instanceof Error) return;

      setSynchronizationCount((prev) => {
        return {
          ...prev,
          [id]: result
        };
      });

      return result;
    },
    [dispatch]
  );

  const settings = dataTableSettings({
    t,
    registerId,
    readOnly: !isEditable,
    actions: {
      ...actions,
      handleUpdateStatus
    },
    userUnits
  });

  const titleConcat = `${t(title)} ${registerName}`;
  const exportEnabled = exportEnabledUnits.some((id) => userUnits.map(({ id }) => id).includes(id));

  return (
    <LeftSidebarLayout
      location={location}
      title={<RenderOneLine title={titleConcat} textParams={'400 30px Roboto'} />}
      loading={loading}
      backButton={'/registry'}
    >
      <DataTable
        {..._.merge(settings, dataTableAdapter(props as never))}
        data={mappedData}
        CustomToolbar={() => (
          <div style={toolbarStyle}>
            {exportEnabled && (
              <ExportRegisterKeys
                registerId={registerId}
                data={props.data}
                ColorButton={ColorButton}
                loading={loading}
              />
            )}
            {isEditable && (
              <>
                <CreateNewKey
                  actions={actions}
                  registerId={registerId}
                  ColorButton={ColorButton}
                  loading={loading}
                />

                <ImportRegisterKeys ColorButton={ColorButton} loading={loading} />

                <ImportRegistersKeysXLS ColorButton={ColorButton} loading={loading} />
              </>
            )}
          </div>
        )}
      />
    </LeftSidebarLayout>
  );
};

const mapStateToProps = ({ auth: { info: userInfo, userUnits } }: { auth: { info: unknown; userUnits: unknown } }) => ({
  userInfo,
  userUnits
});

const translated = translate('KeyListAdminPage')(KeyListPage as never);
const connected = connect(mapStateToProps, null)(translated as never);
const moduleKeyListAdminPage = asModulePage(connected as never);
export default dataTableConnect(endPoint as never)(moduleKeyListAdminPage as never);
