import React from 'react';
import { useTranslate } from 'react-translate';
import { DataTableStated as DataTableStatedUntyped } from 'components/DataTable';

interface UserRecord {
  userId: string | number;
  ipn?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  [key: string]: unknown;
}

interface UserTableProps {
  data: UserRecord[] | null;
  emptyDataText?: string;
  UserAction: React.ComponentType<UserRecord>;
  darkTheme?: boolean;
  controls?: Record<string, unknown>;
  shortInfo?: boolean;
  CustomToolbar?: React.ComponentType<unknown> | null;
}

interface Column {
  id: string;
  name?: string;
  render: (value: unknown, user: UserRecord) => React.ReactNode;
}

const UserTable = ({
  data,
  emptyDataText,
  UserAction,
  darkTheme,
  controls,
  shortInfo,
  CustomToolbar,
}: UserTableProps) => {
  // Read at call time rather than module scope: `components/DataTable`'s
  // index.tsx re-exports `DataTableStated` from a file that imports back
  // from the same barrel, so it's circularly self-referencing (see
  // TYPESCRIPT.md's DataTable batch notes) — a module-top-level read can
  // run while that module is still mid-evaluation.
  const DataTableStated = DataTableStatedUntyped as unknown as React.ComponentType<Record<string, unknown>>;
  const t = useTranslate('DataTable');

  let columns: Column[] = [];

  if (shortInfo) {
    columns = [
      {
        id: 'name',
        render: (name, { userId, ipn, lastName, firstName, middleName }) =>
          `${[lastName, firstName, middleName].filter((v) => v && v !== 'null').join(' ')} (${userId}, ${ipn})`,
      },
      {
        id: 'action',
        render: (val, user) => <UserAction {...user} />,
      },
    ];
  } else {
    columns = [
      {
        id: 'name',
        name: t('name'),
        render: (name, { lastName, firstName, middleName }) =>
          [lastName, firstName, middleName].filter((v) => v && v !== 'null').join(' '),
      },
      {
        id: 'userId',
        name: t('id'),
        render: (value) => value as React.ReactNode,
      },
      {
        id: 'ipn',
        name: t('ipn'),
        render: (value) => value as React.ReactNode,
      },
      {
        id: 'action',
        name: t('actions'),
        render: (val, user) => <UserAction {...user} />,
      },
    ];
  }

  return (
    <DataTableStated
      emptyDataText={emptyDataText}
      data={data}
      columns={columns}
      darkTheme={darkTheme}
      CustomToolbar={CustomToolbar}
      controls={{
        pagination: false,
        toolbar: false,
        search: false,
        header: true,
        refresh: false,
        switchView: false,
        ...controls,
      }}
    />
  );
};

export default UserTable;
