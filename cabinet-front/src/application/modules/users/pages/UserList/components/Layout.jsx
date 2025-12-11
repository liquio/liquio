import React from 'react';
import { translate } from 'react-translate';
import { Chip } from '@mui/material';

import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import HighlightText from 'components/HighlightText';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import DataGrid from 'components/DataGridPremium';
import UnitSelect from './UnitSelect';
import DeleteUserAction from './DeleteUserAction';
import AddUnitUser from './AddUnitUser';
import { SchemaForm } from 'components/JsonSchema';
import controls from 'components/DataGridPremium/components/defaultProps';

const UserListPageLayout = ({
  t,
  data,
  search,
  onSearchChange,
  handleAddUnitUser,
  handleDelete,
  unitId,
  setUnitId,
  unitList,
  title,
  load,
  loading,
  location
}) => {
  const columns = React.useMemo(
    () => [
      {
        field: 'name',
        headerName: t('UserListName'),
        sortable: false,
        width: 300,
        valueGetter: ({ row: { lastName, firstName, middleName } }) =>
          [lastName, firstName, middleName].filter(Boolean).map(capitalizeFirstLetter).join(' '),
        renderCell: ({ row: { lastName, firstName, middleName } }) => {
          const text = [lastName, firstName, middleName]
            .filter(Boolean)
            .map(capitalizeFirstLetter)
            .join(' ');
          return <HighlightText highlight={search} text={text} />;
        }
      },
      {
        field: 'status',
        headerName: t('Status'),
        sortable: false,
        width: 150,
        valueGetter: ({ row: { userId, wrongUserInfo } }) => {
          if (userId) return t('Active');
          if (!userId) return t('UnActive');
          if (wrongUserInfo) return t('WrongUserName');
        },
        renderCell: ({ row: { userId, wrongUserInfo } }) => (
          <>
            {userId ? (
              <Chip style={{ marginRight: 4 }} label={t('Active')} />
            ) : (
              <Chip style={{ marginRight: 4 }} label={t('UnActive')} />
            )}
            {wrongUserInfo ? <Chip color="error" label={t('WrongUserName')} /> : null}
          </>
        )
      },
      {
        field: 'ipn',
        headerName: t('RNOKPP'),
        sortable: false,
        valueGetter: ({ row: { ipn } }) => ipn,
        renderCell: ({ row: { ipn } }) => <HighlightText highlight={search} text={ipn} />
      },
      {
        field: 'phone',
        headerName: t('Phone'),
        sortable: false,
        valueGetter: ({ row: { phone } }) => phone,
        renderCell: ({ row: { phone } }) => <HighlightText highlight={search} text={phone} />
      },
      {
        field: 'email',
        headerName: t('Email'),
        sortable: false,
        width: 250,
        valueGetter: ({ row: { email } }) => email,
        renderCell: ({ row: { email } }) => <HighlightText highlight={search} text={email} />
      },
      {
        field: 'actions',
        headerName: t('Actions'),
        type: 'actions',
        sortable: false,
        renderCell: ({ row }) => (
          <DeleteUserAction user={row} handleDelete={handleDelete} load={load} />
        )
      }
    ],
    [t, search, handleDelete, load]
  );

  const getRowId = React.useCallback((row) => row.userId || row.ipn, []);

  const CustomToolbar = React.useCallback(
    (props) => {
      return (
        <>
          <UnitSelect unitList={unitList} value={unitId} onChange={setUnitId} />
          <AddUnitUser {...props} />
        </>
      );
    },
    [unitList, unitId, setUnitId]
  );

  return (
    <LeftSidebarLayout location={location} title={t(title)} loading={loading}>
      <Content>
        {!data && !loading ? (
          <SchemaForm
            path={[]}
            schema={{
              type: 'object',
              properties: {
                warning: {
                  control: 'text.block',
                  htmlBlock: `
                      <div class='fop-blocked-descr'>
                        <p class="info-block-icon" style="font-size: 38px; margin-bottom: 15px;">🤷🏻‍♂</p>
                        <p>${t('error')}</p>
                      </div>
                    `
                }
              }
            }}
          />
        ) : (
          <DataGrid
            rows={data}
            pagination={false}
            search={search}
            loading={loading}
            controls={{ ...controls, export: true }}
            actions={{
              load,
              onSearchChange,
              handleAddUnitUser
            }}
            CustomToolbar={CustomToolbar}
            columns={columns}
            getRowId={getRowId}
          />
        )}
      </Content>
    </LeftSidebarLayout>
  );
};

export default translate('UserListPage')(UserListPageLayout);
