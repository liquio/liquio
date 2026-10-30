import React from 'react';

import DownloadAllRaw from './DownloadAllButton';
import DeleteAllRaw from './DeleteAllButton';

const DownloadAll = DownloadAllRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteAll = DeleteAllRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface FileDataTableToolbarProps {
  rowsSelected?: unknown[];
  actions?: { handleDeleteFile?: unknown; [key: string]: unknown };
  [key: string]: unknown;
}

const FileDataTableToolbar = (props: FileDataTableToolbarProps) => {
  const { rowsSelected = [], actions = {} } = props;

  if (!(rowsSelected || []).length) {
    return null;
  }

  return (
    <>
      <DownloadAll {...props} />
      {actions.handleDeleteFile ? <DeleteAll {...props} /> : null}
    </>
  );
};

export default FileDataTableToolbar;
