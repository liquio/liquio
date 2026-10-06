import React from 'react';
import { Dialog } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

import Preloader from 'components/Preloader';

const styles = {
  dialog: {
    '& > div': {
      background: 'transparent',
      transition: 'none'
    }
  },
  dialogPaper: {
    background: 'transparent',
    boxShadow: 'none'
  }
};

interface BlockScreenProps extends WithStyles<typeof styles> {
  open: boolean;
  transparentBackground?: boolean;
}

const BlockScreen = ({ classes, open, transparentBackground = false }: BlockScreenProps) => {
  if (!open) return null;
  return (
    <Dialog
      open={open}
      maxWidth="md"
      className={transparentBackground ? classes.dialog : ''}
      PaperProps={{
        className: classes.dialogPaper
      }}
    >
      {/* Preloader only ever reads its `classes` prop; `background` was already a no-op. */}
      <Preloader />
    </Dialog>
  );
};

export default withStyles(styles)(BlockScreen);
