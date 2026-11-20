import React from 'react';
import classNames from 'classnames';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import renderHTML from 'helpers/renderHTML';

const styles = (theme: Theme & { warning?: object }) => ({
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

interface BlockQuoteProps extends WithStyles<typeof styles> {
  variant?: 'success' | 'warning' | 'error';
  title?: string;
}

const BlockQuote = ({ variant = 'success', classes, title = '' }: BlockQuoteProps) => (
  <blockquote className={classNames(classes.root, classes[variant])}>
    <p className={classes.content}>{renderHTML(title)}</p>
  </blockquote>
);

export default withStyles(styles)(BlockQuote);
