import React from 'react';

import DownloadFileRaw from './DownloadFile';
import DownloadP7SFileRaw from './DownloadP7SFile';
import ShowPreviewRaw from './ShowPreview';
import FileModalRaw from './FileModal';
import DeleteFileRaw from './DeleteFile';

const DownloadFile = DownloadFileRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DownloadP7SFile = DownloadP7SFileRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ShowPreview = ShowPreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FileModal = FileModalRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteFile = DeleteFileRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface FileItem {
  signature?: unknown;
  [key: string]: unknown;
}

interface AttachesActionsProps {
  item: FileItem;
  actions?: {
    handleDownloadFile?: unknown;
    handleDeleteFile?: unknown;
    [key: string]: unknown;
  };
  fileStorage?: Record<string, unknown>;
  darkTheme?: boolean;
  GridActionsCellItem?: React.ComponentType<Record<string, unknown>> | null;
}

const AttachesActions = ({ item, actions, fileStorage, darkTheme, GridActionsCellItem }: AttachesActionsProps) => {
  const { handleDownloadFile, handleDeleteFile } = actions || {};
  return (
    <>
      {handleDownloadFile ? (
        <DownloadFile item={item} handleDownloadFile={handleDownloadFile} />
      ) : null}
      {item.signature && handleDownloadFile ? (
        <DownloadP7SFile item={item} handleDownloadFile={handleDownloadFile} />
      ) : null}
      <ShowPreview
        item={item}
        fileStorage={fileStorage}
        handleDownloadFile={handleDownloadFile}
        darkTheme={darkTheme}
        GridActionsCellItem={GridActionsCellItem}
      />
      <FileModal item={item} fileStorage={fileStorage} />
      {handleDeleteFile ? (
        <DeleteFile item={item} handleDeleteFile={handleDeleteFile} />
      ) : null}
    </>
  );
};

export default AttachesActions;
