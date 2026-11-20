import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutline';

import ConfirmDialogRaw from 'components/ConfirmDialog';
import promiseChain from 'helpers/promiseChain';
import themeRaw from 'theme';
import { ReactComponent as DeleteIcon } from '../assets/ic_delete.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
// `theme` resolves per-app (see components/CodeEditDialog batch notes in TYPESCRIPT.md
// for the same cross-app dynamic-resolution pattern) — neither real app's theme
// currently declares this flag, so it's always falsy today; cast rather than typed.
const theme = themeRaw as unknown as { fileDataTableTypePremium?: boolean };

interface FileItem {
  id?: string;
  [key: string]: unknown;
}

interface DeleteAllButtonProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  loading?: boolean;
  actions: {
    handleDeleteFile: (file: FileItem) => Promise<unknown>;
    onRowsSelect: (rows: unknown[]) => void;
  };
  rowsSelected: string[];
  data: FileItem[];
}

const DeleteAllButton = (props: DeleteAllButtonProps) => {
  const { t, loading, actions, rowsSelected, data } = props;

  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);

  const alternativeIcons = theme?.fileDataTableTypePremium;

  const handleDelete = React.useCallback(async () => {
    setOpenConfirmDialog(false);

    const files = data.filter(({ id }) => rowsSelected.includes(id as string));
    await promiseChain(files.map((file) => () => actions.handleDeleteFile(file)));
    actions.onRowsSelect([]);
  }, [actions, data, rowsSelected]);

  return (
    <>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Tooltip title={t('DeleteFile')}>
          <IconButton onClick={() => setOpenConfirmDialog(true)} aria-label={t('DeleteFile')}>
            {alternativeIcons ? <DeleteIcon /> : <DeleteOutlinedIcon />}
          </IconButton>
        </Tooltip>
      )}

      <ConfirmDialog
        fullScreen={false}
        t={t}
        open={openConfirmDialog}
        acceptButtonText={t('Delete')}
        title={t('DeleteRecordConfirmation')}
        description={t('DeleteRecordConfirmationText')}
        handleClose={() => setOpenConfirmDialog(false)}
        handleConfirm={handleDelete}
      />
    </>
  );
};

export default translate('WorkflowPage')(DeleteAllButton as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
