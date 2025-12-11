import React from 'react';

import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import { useTranslate } from 'react-translate';

import ConfirmDialog from 'components/ConfirmDialog';

import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

const DeleteTemplateItem = ({ report, handleClose, handleDeleteReport }) => {
  const t = useTranslate('ReportListPage');
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] =
    React.useState(false);

  return (
    <>
      <MenuItem
        onClick={() => {
          handleClose();
          setShowDeleteConfirmDialog(true);
        }}
      >
        <ListItemIcon>
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{t('Delete')}</Typography>
      </MenuItem>
      <ConfirmDialog
        open={showDeleteConfirmDialog}
        darkTheme={true}
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
