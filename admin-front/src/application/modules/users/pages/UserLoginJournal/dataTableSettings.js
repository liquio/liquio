import React from 'react';
import TimeLabel from 'components/Label/Time';

import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import DateFilterHandler from 'components/DataTable/components/DateFilterHandler';
import SelectFilterHandler from 'components/DataTable/components/SelectFilterHandler';
import LabelIcon from '@mui/icons-material/Label';

import { formatUserName } from 'helpers/userName';
import { Link } from 'react-router-dom';

const darkTheme = true;
const actionTypes = [
  {
    id: 'login',
    name: 'login',
  },
  {
    id: 'logout',
    name: 'logout',
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
      id: 'expiresAt',
      name: t('SessionTime'),
      render: (value) => <TimeLabel date={value} />,
    },
    {
      id: 'ip',
      name: t('Ip'),
      render: (ips) => {
        if (!Array.isArray(ips)) {
          return null;
        }
        return ips.filter((ip) => ip.indexOf('127.0.0.1') < 0).join(', ');
      },
    },
    {
      id: 'userName',
      name: t('UserName'),
      render: (userName, { userId }) => {
        if (!userId) {
          return formatUserName(userName);
        }

        return (
          <Link to={`/users/#id=${userId}`}>{formatUserName(userName)}</Link>
        );
      },
    },
    {
      id: 'userId',
      name: t('UserId'),
      disableTooltip: true,
    },
    {
      id: 'userAgent',
      name: t('UserAgent'),
    },
    {
      id: 'clientName',
      name: t('ClientName'),
    },
    {
      id: 'clientId',
      name: t('ClientId'),
    },
  ],
  hiddenColumns: ['id', 'userAgent', 'clientId'],
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
    userName: (props) => (
      <StringFilterHandler
        name={t('UserName')}
        label={t('UserName')}
        darkTheme={darkTheme}
        variant="outlined"
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
    userId: (props) => (
      <StringFilterHandler
        name={t('UserId')}
        label={t('UserId')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    ip: (props) => (
      <StringFilterHandler
        name={t('Ip')}
        label={t('Ip')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    clientId: (props) => (
      <StringFilterHandler
        name={t('ClientId')}
        label={t('ClientId')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
  },
});
