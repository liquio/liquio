import React from 'react';
import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import { useTranslate } from 'react-translate';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import ConfirmDialogRaw from 'components/ConfirmDialog';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportItem {
  id: string;
  [key: string]: unknown;
}

interface DeleteTemplateItemProps {
  report: ReportItem;
  handleClose: () => void;
  handleDeleteReport: (reportId: string) => void;
}

const DeleteTemplateItem = ({ report, handleClose, handleDeleteReport }: DeleteTemplateItemProps) => {
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
