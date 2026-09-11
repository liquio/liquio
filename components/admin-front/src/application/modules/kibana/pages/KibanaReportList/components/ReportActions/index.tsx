import React from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import { IconButton, Menu } from '@mui/material';

import DeleteTemplateItem from './components/DeleteTemplateItem';
import EditTemplateItem from './components/EditTemplateItem';

interface ReportItem {
  id: string;
  [key: string]: unknown;
}

interface ReportActionsProps {
  report: ReportItem;
  handleDeleteReport: (reportId: string) => void;
  handleChangeReport: (report: ReportItem) => void;
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
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <EditTemplateItem
          report={report}
          handleClose={handleClose}
          handleChangeReport={handleChangeReport as never}
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
