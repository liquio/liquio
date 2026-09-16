import React from 'react';
import { translate } from 'react-translate';
import { Chip } from '@mui/material';

import LeftSidebarLayoutRaw, { Content } from 'layouts/LeftSidebar';
import HighlightTextRaw from 'components/HighlightText';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import DataGridRaw from 'components/DataGridPremium';
import UnitSelect from './UnitSelect';
import DeleteUserAction from './DeleteUserAction';
import AddUnitUser from './AddUnitUser';
import { SchemaForm } from 'components/JsonSchema';
import controls from 'components/DataGridPremium/components/defaultProps';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const HighlightText = HighlightTextRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataGrid = DataGridRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UserRow {
  userId?: string | number;
  ipn?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  phone?: string;
  email?: string;
  wrongUserInfo?: boolean;
  [key: string]: unknown;
}

interface Unit {
  id: string | number;
  name: string;
}

interface UserListPageLayoutProps {
  t: (key: string) => string;
  data: UserRow[] | null;
  search: string;
  onSearchChange: (value: string) => void;
  handleAddUnitUser: (user: Record<string, unknown>) => Promise<unknown>;
  handleDelete: (user: UserRow) => Promise<unknown>;
  unitId: string | number | null;
  setUnitId: (id: string | number) => void;
  unitList: Unit[];
  title: string;
  load: () => void;
  loading: boolean;
  location: unknown;
}

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
}: UserListPageLayoutProps) => {
  // Deferred, not module scope: `components/JsonSchema` has a known
  // circular-import history elsewhere in this codebase (see TYPESCRIPT.md's
  // CodeEditDialog batch notes) — a top-level cast risks a TDZ crash if
  // this file ever lands on a cycle through it.
  const SchemaFormLoose = SchemaForm as unknown as React.ComponentType<Record<string, unknown>>;
  const columns = React.useMemo(
    () => [
      {
        field: 'name',
        headerName: t('UserListName'),
        sortable: false,
        width: 300,
        valueGetter: ({ row: { lastName, firstName, middleName } }: { row: UserRow }) =>
          [lastName, firstName, middleName].filter(Boolean).map(capitalizeFirstLetter as never).join(' '),
        renderCell: ({ row: { lastName, firstName, middleName } }: { row: UserRow }) => {
          const text = [lastName, firstName, middleName]
            .filter(Boolean)
            .map(capitalizeFirstLetter as never)
            .join(' ');
          return <HighlightText highlight={search} text={text} />;
        }
      },
      {
        field: 'status',
        headerName: t('Status'),
        sortable: false,
        width: 150,
        valueGetter: ({ row: { userId, wrongUserInfo } }: { row: UserRow }) => {
          if (userId) return t('Active');
          if (!userId) return t('UnActive');
          if (wrongUserInfo) return t('WrongUserName');
        },
        renderCell: ({ row: { userId, wrongUserInfo } }: { row: UserRow }) => (
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
        valueGetter: ({ row: { ipn } }: { row: UserRow }) => ipn,
        renderCell: ({ row: { ipn } }: { row: UserRow }) => <HighlightText highlight={search} text={ipn} />
      },
      {
        field: 'phone',
        headerName: t('Phone'),
        sortable: false,
        valueGetter: ({ row: { phone } }: { row: UserRow }) => phone,
        renderCell: ({ row: { phone } }: { row: UserRow }) => <HighlightText highlight={search} text={phone} />
      },
      {
        field: 'email',
        headerName: t('Email'),
        sortable: false,
        width: 250,
        valueGetter: ({ row: { email } }: { row: UserRow }) => email,
        renderCell: ({ row: { email } }: { row: UserRow }) => <HighlightText highlight={search} text={email} />
      },
      {
        field: 'actions',
        headerName: t('Actions'),
        type: 'actions',
        sortable: false,
        renderCell: ({ row }: { row: UserRow }) => (
          <DeleteUserAction user={row} handleDelete={handleDelete} load={load} />
        )
      }
    ],
    [t, search, handleDelete, load]
  );

  const getRowId = React.useCallback((row: UserRow) => row.userId || row.ipn, []);

  const CustomToolbar = React.useCallback(
    (props: Record<string, unknown>) => {
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
          <SchemaFormLoose
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

export default translate('UserListPage')(UserListPageLayout as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
