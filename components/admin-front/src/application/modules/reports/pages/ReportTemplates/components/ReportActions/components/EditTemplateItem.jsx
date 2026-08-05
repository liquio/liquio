import React from 'react';

import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import { useTranslate } from 'react-translate';

import RenameReportDialog from 'modules/reports/pages/ReportTemplates/components/RenameReportDialog';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

const EditTemplateItem = ({ report, handleClose, handleChangeReport }) => {
  const t = useTranslate('ReportListPage');
  const [openEditDialog, setOpenEditDialog] = React.useState(false);

  return (
    <>
      <MenuItem
        onClick={() => {
          handleClose();
          setOpenEditDialog(true);
        }}
      >
        <ListItemIcon>
          <EditOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{t('Edit')}</Typography>
      </MenuItem>

      {openEditDialog ? (
        <RenameReportDialog
          report={report}
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          handleSave={handleChangeReport}
        />
      ) : null}
    </>
  );
};

export default EditTemplateItem;
