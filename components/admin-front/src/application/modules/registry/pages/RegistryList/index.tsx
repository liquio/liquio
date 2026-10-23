import React from 'react';
import _ from 'lodash/fp';
import { useDispatch } from 'react-redux';
import { history } from 'store';
import { useTranslate } from 'react-translate';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';

import endPoint from 'application/endPoints/registry';
import useTable from 'services/dataTable/useTable';

import DataTableRaw from 'components/DataTable';
import checkAccess from 'helpers/checkAccess';
import { useAuth } from 'hooks/useAuth';
import { getFavorites } from 'actions/favorites';

import asModulePage from 'hooks/asModulePage';
import CreateNewRegisterRaw from './components/CreateNewRegister';
import ImportRegistersKeysXLSRaw from './components/ImportRegistersKeysXLS';

import dataTableSettings from './variables/dataTableSettings';
import ImportRegisterKeysRaw from '../KeyList/components/KeyActions/ImportRegisterKeys';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const CreateNewRegister = CreateNewRegisterRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ImportRegistersKeysXLS = ImportRegistersKeysXLSRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ImportRegisterKeys = ImportRegisterKeysRaw as unknown as React.ComponentType<Record<string, unknown>>;

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
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

const styles = (theme: { breakpoints: { down: (key: string) => string } }) => ({
  buttonsWrapper: {
    [theme.breakpoints.down('md')]: {
      marginTop: '10px'
    }
  }
});

interface RegistryListPageProps {
  classes: Record<string, string>;
  location: unknown;
  title: string;
}

const RegistryListPage = (props: RegistryListPageProps) => {
  const classes = props?.classes;
  const t = useTranslate('RegistryListAdminPage');
  const dispatch = useDispatch();

  const { info: userInfo, userUnits } = useAuth();

  const tableProps = useTable({ ...endPoint, autoLoad: true } as never) as unknown as {
    loading: boolean;
    actions: Record<string, unknown>;
    [key: string]: unknown;
  };
  const isEditable = checkAccess({ userHasUnit: [1000002] }, userInfo as never, userUnits as never) as boolean;

  const settings = dataTableSettings({
    ...tableProps,
    t,
    readOnly: !isEditable
  } as never);

  React.useEffect(() => {
    (getFavorites({
      entity: 'registers'
    }) as never as (dispatch: unknown) => void)(dispatch);
  }, [dispatch]);

  return (
    <LeftSidebarLayout
      location={props.location}
      title={t(props.title)}
      loading={tableProps.loading}
    >
      <DataTable
        {..._.merge(settings, tableProps)}
        onRowClick={({ id }: { id: string }) => history.push(`/registry/${id}`)}
        CustomToolbar={() =>
          !isEditable ? null : (
            <>
              <CreateNewRegister actions={tableProps.actions} ColorButton={ColorButton} />
              <div className={classes.buttonsWrapper}>
                <ImportRegisterKeys ColorButton={ColorButton} title={props.title} />
                <ImportRegistersKeysXLS actions={tableProps.actions} ColorButton={ColorButton} />
              </div>
            </>
          )
        }
      />
    </LeftSidebarLayout>
  );
};

const styled = withStyles(styles as never)(RegistryListPage as never);

export default asModulePage(styled as never);
