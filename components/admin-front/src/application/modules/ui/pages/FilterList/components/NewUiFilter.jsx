import React from 'react';
import { translate } from 'react-translate';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';

import UiFilterDialog from 'modules/ui/pages/FilterList/components/UiFilterDialog';

const ColorButton = withStyles((theme) => ({
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

const NewUiFilter = ({ t, onCommit }) => {
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

export default translate('UIFilterList')(NewUiFilter);
