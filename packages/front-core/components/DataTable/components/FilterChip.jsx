import React from 'react';
import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = (theme) => ({
  chip: {
    marginLeft: 8,
    marginTop: 1,
    marginBottom: 1,
    background: theme.chipColor,
    borderRadius: 16,
    border: 'none',
    '& span': {
      color: theme.iconButtonFill
    }
  }
});

const FilterChip = ({ classes, ...rest }) => (
  <Chip {...rest} key={rest?.label} className={classes.chip} />
);

FilterChip.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(FilterChip);
