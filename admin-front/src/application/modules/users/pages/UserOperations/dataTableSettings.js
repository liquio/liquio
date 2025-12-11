import React from 'react';
import TimeLabel from 'components/Label/Time';

import UsersFilterHandler from 'modules/workflow/pages/JournalList/components/UsersFilterHandler';
import DateFilterHandler from 'components/DataTable/components/DateFilterHandler';
import SelectFilterHandler from 'components/DataTable/components/SelectFilterHandler';

import LabelIcon from '@mui/icons-material/Label';

import getUserName, { formatUserName } from 'helpers/userName';
import { Link } from 'react-router-dom';

const darkTheme = true;
const actionTypes = [
  {
    id: 'block',
    name: 'block',
  },
  {
    id: 'unblock',
    name: 'unblock',
  },
  {
    id: 'delete',
    name: 'delete',
  },
];

export default ({ t }) => ({
  controls: {
    pagination: true,
    toolbar: true,
    search: true,
    header: true,
    refresh: true,
    customizateColumns: true,
    bottomPagination: true,
  },
  checkable: false,
  darkTheme: darkTheme,
  columns: [
    {
      id: 'id',
      name: t('Id'),
    },
    {
      id: 'createdAt',
      name: t('CreatedAt'),
      render: (value) => <TimeLabel date={value} />,
    },
    {
      id: 'actionType',
      name: t('ActionType'),
    },
    {
      id: 'createdBy',
      name: t('createdBy'),
      render: ({ name, userId }) => {
        if (!userId) {
          return formatUserName(name);
        }

        return <Link to={`/users/#id=${userId}`}>{formatUserName(name)}</Link>;
      },
    },
    {
      id: 'user',
      name: t('UserName'),
      render: ({
        id,
        firstName: first_name,
        lastName: last_name,
        middleName: middle_name,
      }) => {
        if (!id) {
          return getUserName({ first_name, last_name, middle_name });
        }

        return (
          <Link to={`/users/#id=${id}`}>
            {getUserName({ first_name, last_name, middle_name })}
          </Link>
        );
      },
    },
  ],
  hiddenColumns: ['id'],
  filterHandlers: {
    from_created_at: (props) => (
      <DateFilterHandler
        name={t('FromShort')}
        label={t('FromShort')}
        darkTheme={darkTheme}
        {...props}
      />
    ),
    to_created_at: (props) => (
      <DateFilterHandler
        name={t('ToShort')}
        label={t('ToShort')}
        darkTheme={darkTheme}
        {...props}
      />
    ),
    initiatorId: (props) => (
      <UsersFilterHandler
        name={t('createdBy')}
        label={t('createdBy')}
        darkTheme={darkTheme}
        {...props}
      />
    ),
    userId: (props) => (
      <UsersFilterHandler
        name={t('UserName')}
        label={t('UserName')}
        darkTheme={darkTheme}
        {...props}
      />
    ),
    actionType: (props) => (
      <SelectFilterHandler
        name={t('ActionType')}
        label={t('ActionType')}
        options={actionTypes}
        darkTheme={darkTheme}
        listDisplay={true}
        useOwnNames={true}
        IconComponent={(props) => <LabelIcon {...props} />}
        {...props}
      />
    ),
  },
});
