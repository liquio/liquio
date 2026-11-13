import React from 'react';

import MenuIcon from '@mui/icons-material/Menu';
import { Divider, IconButton, Menu } from '@mui/material';

import DeleteTemplateItem from 'modules/reports/pages/ReportTemplates/components/ReportActions/components/DeleteTemplateItem';
import EditTemplateItem from 'modules/reports/pages/ReportTemplates/components/ReportActions/components/EditTemplateItem';
import AccessTemplateItem from 'modules/reports/pages/ReportTemplates/components/ReportActions/components/AccessTemplateItem';
import RenderTemplateItem from './components/RenderTemplateItem';

interface ReportLike {
  id?: string;
  data: { name?: string; schema?: Record<string, unknown> };
  [key: string]: unknown;
}

interface ReportActionsProps {
  report: ReportLike;
  handleDeleteReport: (id: string | undefined) => void;
  handleChangeReport: (report: ReportLike, arg2?: boolean) => Promise<void>;
  handleRenderReport: (value: unknown) => Promise<void> | void;
}

const ReportActions = ({
  report,
  handleDeleteReport,
  handleChangeReport,
  handleRenderReport,
}: ReportActionsProps) => {
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
        <RenderTemplateItem
          report={report}
          handleClose={handleClose}
          handleRenderReport={handleRenderReport}
        />
        <EditTemplateItem
          report={report}
          handleClose={handleClose}
          handleChangeReport={handleChangeReport as never}
        />
        <AccessTemplateItem
          report={report}
          handleClose={handleClose}
          handleChangeReport={handleChangeReport as never}
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
