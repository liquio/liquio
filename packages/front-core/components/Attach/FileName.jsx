import React from 'react';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';

import RenderOneLine from 'helpers/renderOneLine';

const styles = (theme) => ({
  noBreak: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
      lineHeight: '18px',
      marginBottom: 4
    }
  },
  whiteSpace: {
    whiteSpace: 'nowrap'
  }
});

export default withStyles(styles)(({ classes, children, whiteSpace, cutLine }) => (
  <div
    className={classNames(classes.noBreak, {
      [classes.whiteSpace]: whiteSpace
    })}
  >
    {cutLine ? <RenderOneLine title={children} /> : children}
  </div>
));
