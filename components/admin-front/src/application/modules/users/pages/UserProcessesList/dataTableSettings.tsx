import React from 'react';

import { Typography } from '@mui/material';

import TimeLabel from 'components/Label/Time';
import { formatUserName } from 'helpers/userName';
import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
// import SelectFilterHandler from 'components/DataTable/components/SelectFilterHandler';
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
    presets: true,
    bottomPagination: true,
  },
  checkable: false,
  darkTheme: darkTheme,
  columns: [
    {
      id: 'type',
      align: 'left',
      sortable: true,
      name: t('Type'),
    },
    {
      id: 'createdAt',
      width: 160,
      align: 'left',
      sortable: true,
      padding: 'checkbox',
      name: t('CreatedAt'),
      render: (value: string) => <TimeLabel date={value} />,
    },
    {
      id: 'userName',
      align: 'left',
      sortable: true,
      name: t('UserName'),
      render: (userName: string, { userId }: { userId?: string }) => (
        <>
          {formatUserName(userName)}
          <Typography variant="caption" display="block" gutterBottom>
            {userId}
          </Typography>
        </>
      ),
    },
    {
      id: 'documentId',
      align: 'left',
      sortable: false,
      name: t('DocumentId'),
    },
    {
      id: 'ip',
      align: 'left',
      sortable: false,
      name: t('Ip'),
      render: (value: string[]) => value.map((key) => key).join('; '),
    },
  ],
  filterHandlers: {
    type: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('Type')}
        label={t('Type')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    documentId: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('DocumentId')}
        label={t('DocumentId')}
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
    userName: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('UserName')}
        label={t('UserName')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
  },
});
