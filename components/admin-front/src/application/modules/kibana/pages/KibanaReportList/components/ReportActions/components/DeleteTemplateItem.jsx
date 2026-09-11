import React from 'react';
import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import { useTranslate } from 'react-translate';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import ConfirmDialog from 'components/ConfirmDialog';

const DeleteTemplateItem = ({ report, handleClose, handleDeleteReport }) => {
  const t = useTranslate('KibanaReports');
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = React.useState(false);

  return (
    <>
      <MenuItem
        onClick={() => {
          handleClose();
          setShowDeleteConfirmDialog(true);
        }}
      >
        <ListItemIcon>
          <DeleteOutlineOutlinedIcon />
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
