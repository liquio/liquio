import React from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import { IconButton, Menu } from '@mui/material';

import DeleteTemplateItem from 'modules/reports/pages/ReportList/components/ReportActions/components/DeleteTemplateItem';
import EditTemplateItem from 'modules/reports/pages/ReportList/components/ReportActions/components/EditTemplateItem';

interface ReportActionsProps {
  report: { id: string | number; [key: string]: unknown };
  handleDeleteReport: (id: string | number) => void;
  handleChangeReport: (value: unknown, replace: boolean) => Promise<unknown>;
}

const ReportActions = ({ report, handleDeleteReport, handleChangeReport }: ReportActionsProps) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | undefined>();

  const handleClose = () => setAnchorEl(undefined);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);

  return (
    <>
      <IconButton onClick={handleClick} size="large">
        <MenuIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
        <EditTemplateItem
          report={report}
          handleClose={handleClose}
          handleChangeReport={handleChangeReport}
        />
        <DeleteTemplateItem
          report={report}
          handleClose={handleClose}
          handleDeleteReport={handleDeleteReport}
        />
      </Menu>
    </>
  );
};

export default ReportActions;
