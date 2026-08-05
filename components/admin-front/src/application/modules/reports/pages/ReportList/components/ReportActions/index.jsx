import React from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import { IconButton, Menu } from '@mui/material';

import DeleteTemplateItem from './components/DeleteTemplateItem';
import EditTemplateItem from './components/EditTemplateItem';

const ReportActions = ({ report, handleDeleteReport, handleChangeReport }) => {
  const [anchorEl, setAnchorEl] = React.useState();

  const handleClose = () => setAnchorEl();
  const handleClick = (event) => setAnchorEl(event.currentTarget);

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
