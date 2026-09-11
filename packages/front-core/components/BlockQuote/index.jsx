import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';

import renderHTML from 'helpers/renderHTML';

const styles = (theme) => ({
  root: {
    margin: '24px 0',
    padding: '4px 24px',
    fontFamily: theme.typography.fontFamily
  },
  content: {
    marginTop: 16
  },
  warning: {
    borderLeft: '5px solid #ffe564',
    backgroundColor: 'rgba(255,229,100,0.2)',
    ...(theme?.warning || {})
  },
  success: {
    borderLeft: '5px solid #acff64',
    backgroundColor: 'rgba(180, 255, 100, 0.2)'
  },
  error: {
    borderLeft: '5px solid #ff6464',
    backgroundColor: 'rgba(255, 100, 100, 0.2)'
  }
});

const BlockQuote = ({ variant, classes, title }) => (
  <blockquote className={classNames(classes.root, classes[variant])}>
    <p className={classes.content}>{renderHTML(title)}</p>
  </blockquote>
);

BlockQuote.propTypes = {
  variant: PropTypes.string,
  classes: PropTypes.object.isRequired,
  title: PropTypes.string
};

BlockQuote.defaultProps = {
  variant: 'success',
  title: ''
};

export default withStyles(styles)(BlockQuote);
