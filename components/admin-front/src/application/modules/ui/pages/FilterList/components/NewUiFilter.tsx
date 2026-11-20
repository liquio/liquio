import React from 'react';
import { translate } from 'react-translate';
import { Button } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';

import UiFilterDialog from 'modules/ui/pages/FilterList/components/UiFilterDialog';

type AppTheme = Theme & {
  buttonBg?: string;
  searchInputBg?: string;
  listHover?: string;
};

const ColorButton = withStyles((theme: AppTheme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover
    },
    '& svg': {
      fill: theme.buttonBg,
      marginRight: 6
    }
  }
}))(Button);

interface UiFilter {
  id?: string;
  isActive?: boolean;
  filter?: string;
  name?: string;
}

interface NewUiFilterProps {
  t: (key: string) => string;
  onCommit: (data: UiFilter) => Promise<void>;
}

const NewUiFilter = ({ t, onCommit }: NewUiFilterProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <ColorButton
        variant="contained"
        color="primary"
        disableElevation={true}
        onClick={() => setOpen(true)}
      >
        <AddIcon />
        {t('NewUiFilter')}
      </ColorButton>

      <UiFilterDialog open={open} onCommit={onCommit} onClose={() => setOpen(false)} />
    </>
  );
};

export default translate('UIFilterList')(NewUiFilter as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
