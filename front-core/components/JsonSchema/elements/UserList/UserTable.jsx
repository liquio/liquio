import React from 'react';
import { useTranslate } from 'react-translate';
import { DataTableStated } from 'components/DataTable';

const UserTable = ({
  data,
  emptyDataText,
  UserAction,
  darkTheme,
  controls,
  shortInfo,
  CustomToolbar,
}) => {
  const t = useTranslate('DataTable');

  let columns = [];

  if (shortInfo) {
    columns = [
      {
        id: 'name',
        render: (name, { userId, ipn, lastName, firstName, middleName }) =>
          `${lastName} ${firstName} ${middleName} (${userId}, ${ipn})`,
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
          `${lastName} ${firstName} ${middleName}`,
      },
      {
        id: 'userId',
        name: t('id'),
        render: (value) => value,
      },
      {
        id: 'ipn',
        name: t('ipn'),
        render: (value) => value,
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
