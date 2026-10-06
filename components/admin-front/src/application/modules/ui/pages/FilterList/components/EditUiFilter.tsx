import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import UiFilterDialog from './UiFilterDialog';

interface UiFilter {
  id?: string;
  isActive?: boolean;
  filter?: string;
  name?: string;
}

interface EditUiFilterProps {
  t: (key: string) => string;
  value: UiFilter;
  onCommit: (data: UiFilter) => Promise<void>;
  onDelete: (data: UiFilter) => Promise<void>;
}

const EditUiFilter = ({ t, value, onCommit, onDelete }: EditUiFilterProps) => {
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

export default translate('UIFilterList')(EditUiFilter as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
