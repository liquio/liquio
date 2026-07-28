import React from 'react';

import TimeLabel from 'components/Label/Time';

const historySchema = (t) => ({
  columns: [
    {
      field: 'operation',
      headerName: t('Operation'),
      sortable: false,
      hiddenSearch: true,
      renderCell: ({ row }) => {
        return row?.operation;
      }
    },
    {
      field: 'data',
      headerName: t('Name'),
      hiddenSearch: true,
      sortable: false
    },
    {
      field: 'person',
      headerName: t('CreatedBy'),
      hiddenSearch: true,
      sortable: false,
      renderCell: ({ row }) => {
        return row?.person?.name || row?.person?.personName || '';
      }
    },
    {
      field: 'meta.person.id',
      headerName: t('UserId'),
      hiddenSearch: true,
      sortable: false,
      renderCell: ({ row }) => {
        return row?.data?.meta?.person?.id;
      }
    },
    {
      field: 'meta.person.name',
      headerName: t('UserPIB'),
      hiddenSearch: true,
      sortable: false,
      renderCell: ({ row }) => {
        return row?.data?.meta?.person?.name;
      }
    },
    {
      field: 'createdAt',
      headerName: t('CreatedAt'),
      sortable: false,
      hiddenSearch: true,
      renderCell: ({ row }) => {
        return <TimeLabel date={row?.createdAt} />;
      }
    },
    {
      field: 'updatedBy',
      headerName: t('UpdatedBy'),
      sortable: false,
      hiddenSearch: true,
      renderCell: ({ row }) => {
        return row?.updatedBy;
      }
    },
    {
      field: 'updatedAt',
      headerName: t('UpdatedAt'),
      sortable: false,
      hiddenSearch: true,
      renderCell: ({ row }) => {
        return <TimeLabel date={row?.updatedAt} />;
      }
    }
  ],
  columnOrder: [],
  hiddenColumns: [],
  customColumns: []
});

const defaultSchema = (t) => ({
  columns: [
    {
      field: 'data',
      headerName: t('Name'),
      sortable: false
    },
    {
      field: 'createdBy',
      headerName: t('CreatedBy'),
      sortable: false
    },
    {
      field: 'meta.person.id',
      headerName: t('UserId'),
      sortable: false
    },
    {
      field: 'meta.person.name',
      headerName: t('UserPIB'),
      sortable: false
    },
    {
      field: 'createdAt',
      headerName: t('CreatedAt'),
      sortable: false,
      renderCell: ({ row }) => {
        return <TimeLabel date={row?.createdAt} />;
      }
    },
    {
      field: 'updatedBy',
      headerName: t('UpdatedBy'),
      sortable: false
    },
    {
      field: 'updatedAt',
      headerName: t('UpdatedAt'),
      sortable: false,
      renderCell: ({ row }) => {
        return <TimeLabel date={row?.updatedAt} />;
      }
    }
  ],
  columnOrder: [
    'data',
    'createdBy',
    'meta.person.id',
    'meta.person.name',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ],
  hiddenColumns: [
    'data',
    'createdBy',
    'meta.person.id',
    'meta.person.name',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ],
  customColumns: []
});

export default (t, isHistory) => {
  if (isHistory) {
    return historySchema(t);
  }

  return defaultSchema(t);
};
