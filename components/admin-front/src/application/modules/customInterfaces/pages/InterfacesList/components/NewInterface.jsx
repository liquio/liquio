import React from 'react';
import { translate } from 'react-translate';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import InterfaceDialog from 'modules/customInterfaces/pages/InterfacesList/components/InterfaceDialog';

export const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover,
    },
    '& svg': {
      fill: theme.buttonBg,
      marginRight: 6,
    },
  },
}))(Button);

const NewInterface = ({ t, onCommit }) => {
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
        {t('NewInterface')}
      </ColorButton>

      <InterfaceDialog
        open={open}
        onCommit={onCommit}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default translate('InterfacesList')(NewInterface);
