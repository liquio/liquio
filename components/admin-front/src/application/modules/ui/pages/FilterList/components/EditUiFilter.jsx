import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import UiFilterDialog from './UiFilterDialog';

const EditUiFilter = ({ t, value, onCommit, onDelete }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('EditUiFilter')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <MoreHorizIcon />
        </IconButton>
      </Tooltip>
      <UiFilterDialog
        open={open}
        value={value}
        onCommit={onCommit}
        onDelete={onDelete}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default translate('UIFilterList')(EditUiFilter);
