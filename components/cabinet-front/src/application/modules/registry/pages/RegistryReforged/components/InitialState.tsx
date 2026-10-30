import React from 'react';

import TimeLabel from 'components/Label/Time';

interface ColumnDef {
  field: string;
  headerName: string;
  sortable?: boolean;
  hiddenSearch?: boolean;
  renderCell?: (params: { row: Record<string, unknown> }) => React.ReactNode;
}

interface SchemaState {
  columns: ColumnDef[];
  columnOrder: string[];
  hiddenColumns: string[];
  customColumns: unknown[];
}

const historySchema = (t: (key: string) => string): SchemaState => ({
  columns: [
    {
      field: 'operation',
      headerName: t('Operation'),
      sortable: false,
      hiddenSearch: true,
      renderCell: ({ row }) => {
        return row?.operation as React.ReactNode;
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
        const person = row?.person as { name?: string; personName?: string } | undefined;
        return person?.name || person?.personName || '';
      }
    },
    {
      field: 'meta.person.id',
      headerName: t('UserId'),
      hiddenSearch: true,
      sortable: false,
      renderCell: ({ row }) => {
        const data = row?.data as { meta?: { person?: { id?: unknown } } } | undefined;
        return data?.meta?.person?.id as React.ReactNode;
      }
    },
    {
      field: 'meta.person.name',
      headerName: t('UserPIB'),
      hiddenSearch: true,
      sortable: false,
      renderCell: ({ row }) => {
        const data = row?.data as { meta?: { person?: { name?: unknown } } } | undefined;
        return data?.meta?.person?.name as React.ReactNode;
      }
    },
    {
      field: 'createdAt',
      headerName: t('CreatedAt'),
      sortable: false,
      hiddenSearch: true,
      renderCell: ({ row }) => {
        return <TimeLabel date={row?.createdAt as string} />;
      }
    },
    {
      field: 'updatedBy',
      headerName: t('UpdatedBy'),
      sortable: false,
      hiddenSearch: true,
      renderCell: ({ row }) => {
        return row?.updatedBy as React.ReactNode;
      }
    },
    {
      field: 'updatedAt',
      headerName: t('UpdatedAt'),
      sortable: false,
      hiddenSearch: true,
      renderCell: ({ row }) => {
        return <TimeLabel date={row?.updatedAt as string} />;
      }
    }
  ],
  columnOrder: [],
  hiddenColumns: [],
  customColumns: []
});

const defaultSchema = (t: (key: string) => string): SchemaState => ({
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
        return <TimeLabel date={row?.createdAt as string} />;
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
        return <TimeLabel date={row?.updatedAt as string} />;
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

export default (t: (key: string) => string, isHistory?: boolean): SchemaState => {
  if (isHistory) {
    return historySchema(t);
  }

  return defaultSchema(t);
};
