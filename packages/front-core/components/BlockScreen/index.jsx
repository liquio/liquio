import React from 'react';
import PropTypes from 'prop-types';
import { Dialog } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

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

const BlockScreen = ({ classes, open, transparentBackground }) => {
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
      <Preloader background={'#f5f5f5'} />
    </Dialog>
  );
};

BlockScreen.propTypes = {
  classes: PropTypes.object.isRequired,
  open: PropTypes.bool.isRequired,
  transparentBackground: PropTypes.bool
};

BlockScreen.defaultProps = {
  transparentBackground: false
};

export default withStyles(styles)(BlockScreen);
