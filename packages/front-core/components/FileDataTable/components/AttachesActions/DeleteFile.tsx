import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';

import themeRaw from 'theme';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import { ReactComponent as DeleteOutlineOutlinedIcon } from 'assets/img/delete_outline.svg';
import { ReactComponent as DeleteIcon } from '../../assets/ic_delete.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
// `theme` resolves per-app; see the CodeEditDialog batch notes in TYPESCRIPT.md.
const theme = themeRaw as unknown as { fileDataTableTypePremium?: boolean };

interface FileItem {
  [key: string]: unknown;
}

interface DeleteFileProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  handleDeleteFile?: (item: FileItem) => void;
  item: FileItem;
  GridActionsCellItem?: React.ComponentType<Record<string, unknown>> | null;
  hidden?: boolean;
}

const DeleteFile = (props: DeleteFileProps) => {
  const { t, handleDeleteFile, item, GridActionsCellItem, hidden } = props;

  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);

  const handleDelete = React.useCallback(() => {
    setOpenConfirmDialog(false);
    handleDeleteFile?.(item);
  }, [handleDeleteFile, item]);

  if (!handleDeleteFile || hidden) return null;

  return (
    <>
      <Tooltip title={t('DeleteFile')}>
        {GridActionsCellItem ? (
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label={t('DeleteFile')}
            aria-label={t('DeleteFile')}
            onClick={() => setOpenConfirmDialog(true)}
          />
        ) : (
          <IconButton onClick={() => setOpenConfirmDialog(true)} aria-label={t('DeleteFile')}>
            {theme?.fileDataTableTypePremium ? <DeleteIcon /> : <DeleteOutlineOutlinedIcon />}
          </IconButton>
        )}
      </Tooltip>
      <ConfirmDialog
        fullScreen={false}
        t={t}
        open={openConfirmDialog}
        title={t('DeleteRecordConfirmation')}
        description={t('DeleteRecordConfirmationText')}
        handleClose={() => setOpenConfirmDialog(false)}
        handleConfirm={handleDelete}
      />
    </>
  );
};

export default translate('WorkflowPage')(DeleteFile as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
