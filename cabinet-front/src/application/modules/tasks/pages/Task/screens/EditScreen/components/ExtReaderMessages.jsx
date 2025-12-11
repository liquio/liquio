import React from 'react';
import PropTypes from 'prop-types';
import { FormControl, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import ProgressLine from 'components/Preloader/ProgressLine';
import renderHTML from 'helpers/renderHTML';

const styles = (theme) => ({
  popper: {
    fontSize: 16,
    marginBottom: 20,
    marginTop: 20,
    padding: 16,
    maxWidth: 640,
    background: 'rgb(255, 244, 215)'
  },
  errorPopper: {
    fontSize: 18,
    maxWidth: 640,
    marginBottom: 30
  },
  emptyEmoji: {
    marginTop: 15,
    fontSize: 48,
    width: 48,
    height: 48,
    display: 'inline-block',
    marginBottom: 12,
    position: 'relative',
    [theme.breakpoints.down('sm')]: {
      marginBottom: 0,
      fontSize: 32
    }
  }
});

const ExtReaderMessages = ({
  inControl,
  busy,
  pendingMessage,
  classes,
  externalReaderErrors,
  isProgressBar
}) => (
  <>
    {busy && pendingMessage && pendingMessage.length ? (
      <>
        <div className={classes.popper}>
          {pendingMessage.map((mss, index) => (
            <Typography key={index} aria-live="polite">
              {mss}
            </Typography>
          ))}
        </div>
        {inControl && isProgressBar ? <ProgressLine loading={true} /> : null}
      </>
    ) : null}
    {!busy && externalReaderErrors && externalReaderErrors.length ? (
      <FormControl className={classes.root}>
        <span role="img" aria-label="man-shrugging" className={classes.emptyEmoji}>
          {'🤷‍♂️'}
        </span>
        <div className={classes.errorPopper}>
          {externalReaderErrors.map((error, index) => {
            const message = typeof error === 'string' ? renderHTML(error) : error;
            return <Typography key={index}>{message}</Typography>;
          })}
        </div>
      </FormControl>
    ) : null}
  </>
);

ExtReaderMessages.propTypes = {
  inControl: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  classes: PropTypes.object.isRequired,
  externalReaderErrors: PropTypes.array.isRequired,
  pendingMessage: PropTypes.array.isRequired,
  isProgressBar: PropTypes.bool
};

ExtReaderMessages.defaultProps = {
  isProgressBar: true
};

export default withStyles(styles)(ExtReaderMessages);
