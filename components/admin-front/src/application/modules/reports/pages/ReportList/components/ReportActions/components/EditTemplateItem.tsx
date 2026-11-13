import React from 'react';
import { MenuItem } from '@mui/material';
import { useTranslate } from 'react-translate';

import RenameReportDialogRaw from 'modules/reports/pages/ReportList/components/RenameReportDialog';

const RenameReportDialog = RenameReportDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportLike {
  name?: string;
  [key: string]: unknown;
}

interface EditTemplateItemProps {
  report: ReportLike;
  handleClose: () => void;
  handleChangeReport: (report: ReportLike, arg2?: boolean) => Promise<void>;
}

const EditTemplateItem = ({ report, handleClose, handleChangeReport }: EditTemplateItemProps) => {
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
        {t('Rename')}
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
