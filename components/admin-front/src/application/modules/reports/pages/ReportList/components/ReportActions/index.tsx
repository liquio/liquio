import React from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import { IconButton, Menu } from '@mui/material';

import DeleteTemplateItem from './components/DeleteTemplateItem';
import EditTemplateItem from './components/EditTemplateItem';

interface ReportLike {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

interface ReportActionsProps {
  report: ReportLike;
  handleDeleteReport: (id: string | undefined) => void;
  handleChangeReport: (report: ReportLike, arg2?: boolean) => Promise<void>;
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
