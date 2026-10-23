import React from 'react';
import { MenuItem } from '@mui/material';
import { useTranslate } from 'react-translate';

import ConfirmDialogRaw from 'components/ConfirmDialog';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface DeleteTemplateItemProps {
  report: { id: string | number };
  handleClose: () => void;
  handleDeleteReport: (id: string | number) => void;
}

const DeleteTemplateItem = ({ report, handleClose, handleDeleteReport }: DeleteTemplateItemProps) => {
  const t = useTranslate('ReportListPage');
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = React.useState(false);

  return (
    <>
      <MenuItem
        onClick={() => {
          handleClose();
          setShowDeleteConfirmDialog(true);
        }}
      >
        {t('Delete')}
      </MenuItem>
      <ConfirmDialog
        open={showDeleteConfirmDialog}
        title={t('DeletePrompt')}
        description={t('DeletePropmtDescription')}
        handleClose={() => setShowDeleteConfirmDialog(false)}
        handleConfirm={() => {
          setShowDeleteConfirmDialog(false);
          handleDeleteReport(report.id);
        }}
      />
    </>
  );
};

export default DeleteTemplateItem;
