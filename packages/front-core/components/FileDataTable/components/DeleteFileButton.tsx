import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';

import { ReactComponent as DeleteOutlineOutlinedIcon } from 'assets/img/delete_outline.svg';
import ConfirmDialogRaw from 'components/ConfirmDialog';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface FileLike {
  [key: string]: unknown;
}

interface DeleteFileButtonProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  handleDeleteFile?: (file: FileLike) => void;
  file?: FileLike;
}

const DeleteFileButton = ({ t, handleDeleteFile, file }: DeleteFileButtonProps) => {
  const [open, setOpen] = React.useState(false);

  if (!handleDeleteFile || !file) {
    return null;
  }

  return (
    <>
      <Tooltip title={t('DeleteFile')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <DeleteOutlineOutlinedIcon />
        </IconButton>
      </Tooltip>
      <ConfirmDialog
        open={open}
        title={t('DeleteFile')}
        description={t('DeleteFilePrompt')}
        handleClose={() => setOpen(false)}
        handleConfirm={() => {
          handleDeleteFile(file);
          setOpen(false);
        }}
      />
    </>
  );
};

export default translate('FileDataTable')(DeleteFileButton as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
