import React from 'react';

import MenuIcon from '@mui/icons-material/Menu';
import { Divider, IconButton, Menu } from '@mui/material';

import DeleteTemplateItem from 'modules/reports/pages/ReportTemplates/components/ReportActions/components/DeleteTemplateItem';
import EditTemplateItem from 'modules/reports/pages/ReportTemplates/components/ReportActions/components/EditTemplateItem';
import AccessTemplateItem from 'modules/reports/pages/ReportTemplates/components/ReportActions/components/AccessTemplateItem';
import RenderTemplateItem from './components/RenderTemplateItem';

const ReportActions = ({
  report,
  handleDeleteReport,
  handleChangeReport,
  handleRenderReport,
}) => {
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
        <RenderTemplateItem
          report={report}
          handleClose={handleClose}
          handleRenderReport={handleRenderReport}
        />
        <EditTemplateItem
          report={report}
          handleClose={handleClose}
          handleChangeReport={handleChangeReport}
        />
        <AccessTemplateItem
          report={report}
          handleClose={handleClose}
          handleChangeReport={handleChangeReport}
        />
        <Divider />
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
