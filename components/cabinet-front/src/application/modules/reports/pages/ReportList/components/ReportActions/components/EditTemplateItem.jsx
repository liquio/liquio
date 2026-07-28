import React from 'react';
import { MenuItem } from '@mui/material';
import { useTranslate } from 'react-translate';

import RenameReportDialog from 'modules/reports/pages/ReportList/components/RenameReportDialog';

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
        {t('Edit')}
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
