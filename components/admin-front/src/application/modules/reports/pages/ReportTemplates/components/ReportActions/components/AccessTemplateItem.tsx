import React from 'react';

import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import { useTranslate } from 'react-translate';

import AccessReportDialogRaw from 'modules/reports/pages/ReportTemplates/components/AccessReportDialog';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const AccessReportDialog = AccessReportDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportLike {
  [key: string]: unknown;
}

interface AccessTemplateItemProps {
  report: ReportLike;
  handleClose: () => void;
  handleChangeReport: (report: ReportLike, arg2?: boolean) => Promise<void>;
}

const EditTemplateItem = ({ report, handleClose, handleChangeReport }: AccessTemplateItemProps) => {
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
          <LockOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{t('Access')}</Typography>
      </MenuItem>

      {openEditDialog ? (
        <AccessReportDialog
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
