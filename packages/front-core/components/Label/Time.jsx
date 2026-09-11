import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = (theme) => ({
  text: {
    color: 'inherit',
    minWidth: 140,
    display: 'inline-block',
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
      minWidth: 120,
      lineHeight: '18px',
    },
  },
});

const Time = ({ classes, format, date }) => {
  if (date) {
    return (
      <Tooltip title={moment(date).fromNow()}>
        <span className={classes.text}>{moment(date).format(format)}</span>
      </Tooltip>
    );
  }

  return null;
};

Time.propTypes = {
  date: PropTypes.string.isRequired,
  classes: PropTypes.object.isRequired,
  format: PropTypes.string,
};

Time.defaultProps = {
  format: 'DD.MM.YYYY HH:mm',
};

export default withStyles(styles)(Time);
