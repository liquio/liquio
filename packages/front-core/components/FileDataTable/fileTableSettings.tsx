import React from 'react';
import { Tooltip, IconButton } from '@mui/material';
import KeyIcon from '@mui/icons-material/VpnKey';

import { ReactComponent as SaveAltIcon } from 'assets/img/save_alt.svg';
import FileNameColumnRaw from './components/FileNameColumn';
import DataTableCardRaw from './components/DataTableCard';
import DeleteFileButtonRaw from './components/DeleteFileButton';
import DirectPreviewRaw from './components/DirectPreview';

const FileNameColumn = FileNameColumnRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteFileButton = DeleteFileButtonRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DirectPreview = DirectPreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface FileItem {
  name?: string;
  p7sUrl?: string;
  link?: string;
  [key: string]: unknown;
}

interface FileTableSettingsParams {
  t: (key: string, params?: Record<string, unknown>) => string;
  handleDownload?: (() => void) | null;
  directDownload?: boolean;
  handleDeleteFile?: (file: FileItem) => void;
  isDataGrid?: boolean;
  actions?: Record<string, unknown>;
  isArrayOfFiles?: boolean;
  // Passed by FileDataTable/index.tsx's getSettings alongside dataTableSettings'
  // call (same object shape for both branches) but unused here — the original
  // untyped fileTableSettings.jsx never destructured it either.
  fileStorage?: Record<string, unknown>;
}

export default ({
  t,
  handleDownload,
  directDownload,
  handleDeleteFile,
  isDataGrid,
  actions,
  isArrayOfFiles
}: FileTableSettingsParams) => ({
  components: {
    DataTableCard: DataTableCardRaw
  },
  actions,
  controls: {
    pagination: false,
    toolbar: true,
    search: false,
    header: true,
    refresh: false,
    switchView: false,
    customizateColumns: false
  },
  checkable: isArrayOfFiles,
  cellStyle: {
    verticalAlign: 'middle'
  },
  columns: [
    {
      id: 'fileName',
      name: t('FileName'),
      padding: '0 0 0 20px',
      width: 200,
      render: (value: string, item: FileItem) => {
        const fileName = value || item.name || t('Unnamed');
        return (
          <FileNameColumn
            name={fileName}
            item={item}
            extension={fileName.split('.').pop()}
            isDataGrid={isDataGrid}
          />
        );
      }
    },
    {
      id: 'url',
      name: t('download'),
      align: 'center',
      padding: 'checkbox',
      minWidth: 200,
      cellStyle: {
        width: 70
      },
      render: (url: string, file: FileItem) => (
        <div>
          {directDownload ? (
            <>
              {file?.p7sUrl ? (
                <a href={file.p7sUrl}>
                  <Tooltip title={t('DownloadFileP7S')}>
                    <IconButton size="large">
                      <KeyIcon />
                    </IconButton>
                  </Tooltip>
                </a>
              ) : null}
              <DirectPreview url={url || file?.link} />

              <a href={url || file?.link}>
                <Tooltip title={t('DownloadFile')}>
                  <IconButton size="large">
                    <SaveAltIcon />
                  </IconButton>
                </Tooltip>
              </a>
            </>
          ) : (
            <Tooltip title={t('DownloadFile')}>
              <IconButton onClick={handleDownload as (() => void) | undefined} size="large">
                <SaveAltIcon />
              </IconButton>
            </Tooltip>
          )}
          {handleDeleteFile ? (
            <DeleteFileButton file={file} handleDeleteFile={handleDeleteFile} />
          ) : null}
        </div>
      )
    }
  ]
});
