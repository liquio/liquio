import React from 'react';
import { Dialog } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { WithStyles } from '@mui/styles/withStyles';
import Preloader from 'components/Preloader';

const styles = {
  dialog: {
    '& > div': {
      background: 'transparent',
      transition: 'none',
    },
  },
  dialogPaper: {
    background: 'transparent',
    boxShadow: 'none',
  },
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
        className: classes.dialogPaper,
      }}
    >
      {/* The old `flex={true}` prop is gone: Preloader (and its withStyles wrapper) never read it. */}
      <Preloader />
    </Dialog>
  );
};

// decorate and export
export default withStyles(styles)(BlockScreen);
