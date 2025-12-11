import React from 'react';
import { translate } from 'react-translate';
import { useDispatch, connect } from 'react-redux';
import _ from 'lodash/fp';
import queue from 'queue';
import withStyles from '@mui/styles/withStyles';
import { Button } from '@mui/material';

import LeftSidebarLayout from 'layouts/LeftSidebar';
import asModulePage from 'hooks/asModulePage';
import endPoint from 'application/endPoints/registryKeyList';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import DataTable from 'components/DataTable';
import checkAccess from 'helpers/checkAccess';
import RenderOneLine from 'helpers/renderOneLine';
import { getSynchronizationCount } from 'actions/registry';
import CreateNewKey from './components/CreateNewKey';
import dataTableSettings from './variables/dataTableSettings';
import ImportRegisterKeys from './components/KeyActions/ImportRegisterKeys';
import ImportRegistersKeysXLS from './../RegistryList/components/ImportRegistersKeysXLS';
import ExportRegisterKeys from './components/KeyActions/ExportRegisterKeys';

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
}))(Button);

const exportEnabledUnits = [1000002, 1000000042];

const toolbarStyle = {
  display: 'flex',
  justifyContent: 'end',
  alignItems: 'center',
  width: '100%'
};

const KeyListPage = (props) => {
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
  const [synchronizationCount, setSynchronizationCount] = React.useState({});

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
      setRegisterName(registerName);
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
        const syncCount = await dispatch(getSynchronizationCount(ids));
        if (syncCount instanceof Error) return;
        const transformedObject = [].concat(syncCount).reduce((acc, item) => {
          acc[item.key_id] = [item];
          return acc;
        }, {});
        setSynchronizationCount(transformedObject);
        setLoading(false);
      });
    };

    getSyncCount();
  }, [data, dispatch, queueFactory]);

  const isEditable = checkAccess({ userHasUnit: [1000002] }, userInfo, userUnits);

  const mappedData = React.useMemo(() => {
    if (!data || !data.length) return [];

    return data.map((item) => ({
      ...item,
      sync: synchronizationCount[item.id]
    }));
  }, [data, synchronizationCount]);

  const handleUpdateStatus = React.useCallback(
    async (id) => {
      const result = await dispatch(getSynchronizationCount(id));

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
    registerName,
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
        {..._.merge(settings, dataTableAdapter(props))}
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

const mapStateToProps = ({ auth: { info: userInfo, userUnits } }) => ({
  userInfo,
  userUnits
});

const translated = translate('KeyListAdminPage')(KeyListPage);
const connected = connect(mapStateToProps, null)(translated);
const moduleKeyListAdminPage = asModulePage(connected);
export default dataTableConnect(endPoint)(moduleKeyListAdminPage);
