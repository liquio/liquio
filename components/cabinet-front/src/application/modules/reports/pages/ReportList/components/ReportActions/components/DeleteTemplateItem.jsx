import React from 'react';
import { MenuItem } from '@mui/material';
import { useTranslate } from 'react-translate';

import ConfirmDialog from 'components/ConfirmDialog';

const DeleteTemplateItem = ({ report, handleClose, handleDeleteReport }) => {
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
