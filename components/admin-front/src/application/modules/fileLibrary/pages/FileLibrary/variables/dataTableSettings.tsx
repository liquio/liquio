import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import LinkIcon from '@mui/icons-material/Link';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import SecurityIcon from '@mui/icons-material/Security';

import Thumbnail from '../components/Thumbnail';
import { FileItem } from '../actions/fileLibrary';

type Dispatch = (action: unknown) => unknown;

interface DataTableSettingsParams {
  t: (key: string) => string;
  dispatch: Dispatch;
  actions: {
    downloadItem: (item: FileItem) => void;
    openAccess: (item: FileItem) => void;
    createPublicLink: (item: FileItem) => void;
    confirmDelete: (id: string) => void;
    [key: string]: unknown;
  };
  sort: Record<string, string>;
}

export default ({ t, dispatch, actions, sort }: DataTableSettingsParams) => {
  return {
    controls: {
      pagination: false,
      toolbar: true,
      search: true,
      header: true,
      refresh: true,
      switchView: false,
      customizateColumns: false,
      bottomPagination: false
    },
    actions,
    checkable: true,
    multiple: true,
    darkTheme: true,
    hover: true,
    hiddenColumns: [] as string[],
    sort,
    columns: [
      {
        id: 'icon',
        name: '',
        width: 56,
        render: (_: unknown, item: FileItem) => <Thumbnail item={item} dispatch={dispatch} />
      },
      {
        id: 'name',
        name: t('Name'),
        align: 'left',
        sortable: true,
        render: (value: string) => <Typography>{value}</Typography>
      },
      {
        id: 'type',
        name: t('Type'),
        width: 120,
        sortable: true,
        render: (value: string) => t(value)
      },
      {
        id: 'visibility',
        name: t('Access'),
        width: 120,
        render: (value: string) => (
          <Tooltip title={t(value === 'public' ? 'Public' : 'Private')}>
            {value === 'public' ? <PublicIcon fontSize="small" /> : <LockIcon fontSize="small" />}
          </Tooltip>
        )
      },
      {
        id: 'actions',
        name: t('Actions'),
        width: 220,
        align: 'right',
        disableClick: true,
        render: (_: unknown, item: FileItem) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {item.type === 'file' && (
              <Tooltip title={t('Download')}>
                <IconButton onClick={() => actions.downloadItem(item)} size="large">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t('Access')}>
              <IconButton onClick={() => actions.openAccess(item)} size="large">
                <SecurityIcon />
              </IconButton>
            </Tooltip>
            {item.type === 'file' && (
              <Tooltip title={t('PublicLink')}>
                <IconButton onClick={() => actions.createPublicLink(item)} size="large">
                  <LinkIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t('Delete')}>
              <IconButton onClick={() => actions.confirmDelete(item.id)} size="large">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )
      }
    ]
  };
};
