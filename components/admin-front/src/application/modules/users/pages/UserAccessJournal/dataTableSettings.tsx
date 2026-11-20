import React from 'react';
import { Link } from 'react-router-dom';

import TimeLabel from 'components/Label/Time';

import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import DateFilterHandler from 'components/DataTable/components/DateFilterHandler';

import { formatUserName } from 'helpers/userName';

const userNameRender = (name: string, id?: string, ipn?: string) => {
  if (!id && !ipn) {
    return formatUserName(name);
  }

  const hash = id ? `#id=${id}` : `#ipn=${ipn}`;
  return <Link to={`/users/${hash}`}>{formatUserName(name)}</Link>;
};

const darkTheme = true;

interface DataTableSettingsParams {
  t: (key: string, params?: Record<string, unknown>) => string;
}

export default ({ t }: DataTableSettingsParams) => ({
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
      id: 'operationType',
      sortable: false,
      align: 'left',
      name: t('OperationType'),
      render: (type: string) => t(type),
    },
    {
      id: 'createdAt',
      align: 'left',
      sortable: true,
      name: t('CreatedAt'),
      render: (value: string) => <TimeLabel date={value} />,
    },
    {
      id: 'initUserName',
      align: 'left',
      sortable: false,
      name: t('InitUserName'),
      render: (initUserName: string, { initUserId, initIpn }: { initUserId?: string; initIpn?: string }) =>
        userNameRender(initUserName, initUserId, initIpn) || t('System'),
    },
    {
      id: 'initUserId',
      align: 'left',
      sortable: false,
      name: t('InitUserId'),
    },
    {
      id: 'initIpn',
      align: 'left',
      sortable: false,
      name: t('InitIpn'),
    },
    {
      id: 'initWorkflowId',
      align: 'left',
      sortable: false,
      name: t('InitWorkflowId'),
      render: (initWorkflowId: string) =>
        initWorkflowId ? (
          <Link to={`/workflow/journal/${initWorkflowId}`}>
            {initWorkflowId}
          </Link>
        ) : (
          t('ByAdmin')
        ),
    },
    {
      id: 'userName',
      align: 'left',
      sortable: false,
      name: t('UserName'),
      render: (userName: string, { userId, ipn }: { userId?: string; ipn?: string }) =>
        userNameRender(userName, userId, ipn),
    },
    {
      id: 'userId',
      align: 'left',
      sortable: false,
      name: t('UserId'),
    },
    {
      id: 'ipn',
      align: 'left',
      sortable: false,
      name: t('Ipn'),
    },
    {
      id: 'unitName',
      align: 'left',
      sortable: false,
      name: t('UnitName'),
      render: (unitName: string, { unitId }: { unitId?: string }) => (
        <Link to={`/users/units/${unitId}`}>{unitName}</Link>
      ),
    },
    {
      id: 'unitId',
      align: 'left',
      sortable: false,
      name: t('UnitId'),
    },
  ],
  hiddenColumns: ['initUserId', 'initIpn', 'userId', 'ipn', 'unitId'],
  filterHandlers: {
    from_created_at: (props: Record<string, unknown>) => (
      <DateFilterHandler
        name={t('FromShort')}
        label={t('FromShort')}
        darkTheme={darkTheme}
        {...props}
      />
    ),
    to_created_at: (props: Record<string, unknown>) => (
      <DateFilterHandler
        name={t('ToShort')}
        label={t('ToShort')}
        darkTheme={darkTheme}
        {...props}
      />
    ),
    initUserName: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('InitUserName')}
        label={t('InitUserName')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    initUserId: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('InitUserId')}
        label={t('InitUserId')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    initIpn: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('InitIpn')}
        label={t('InitIpn')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),

    initWorkflowId: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('InitWorkflowId')}
        label={t('InitWorkflowId')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),

    userName: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('UserName')}
        label={t('UserName')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    userId: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('UserId')}
        label={t('UserId')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    ipn: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('Ipn')}
        label={t('Ipn')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),

    unitName: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('UnitName')}
        label={t('UnitName')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    unitId: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('UnitId')}
        label={t('UnitId')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
  },
});
