import React from 'react';
import { Tooltip, IconButton } from '@mui/material';
import KeyIcon from '@mui/icons-material/VpnKey';

import { ReactComponent as SaveAltIcon } from 'assets/img/save_alt.svg';
import FileNameColumn from './components/FileNameColumn';
import DataTableCard from './components/DataTableCard';
import DeleteFileButton from './components/DeleteFileButton';
import DirectPreview from './components/DirectPreview';

export default ({
  t,
  handleDownload,
  directDownload,
  handleDeleteFile,
  isDataGrid,
  actions,
  isArrayOfFiles
}) => ({
  components: {
    DataTableCard
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
      render: (value, item) => {
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
      render: (url, file) => (
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
              <IconButton onClick={handleDownload} size="large">
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
