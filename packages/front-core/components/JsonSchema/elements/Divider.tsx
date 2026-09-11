import React from 'react';
import classNames from 'classnames';
import { Divider } from '@mui/material';

import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

const styles = (theme: Theme) => ({
  divider: {
    margin: '40px 0',
    [theme.breakpoints.down('lg')]: {
      margin: '20px 0',
    },
  },
  noMargin: {
    margin: 0,
  },
  darkTheme: {
    background: '#4E4E4E',
  },
});

interface DividerElementProps extends WithStyles<typeof styles> {
  hidden?: boolean;
  noMargin?: boolean;
  margin?: number | boolean;
  darkTheme?: boolean;
  styles?: Record<string, unknown>;
}

const DividerElement = ({ classes, hidden, noMargin, margin, darkTheme, styles }: DividerElementProps) => {
  if (hidden) {
    return null;
  }

  const customStyles = {
    ...(margin && { margin: `${margin}px 0` }),
    ...(styles || {})
  }
  return (
    <Divider
      // `root` isn't a key produced by this file's own `styles`, so it's always
      // undefined at runtime — preserved from the original, not introduced here.
      className={classNames((classes as Record<string, string>).root, {
        [classes.divider]: true,
        [classes.noMargin]: !!noMargin,
        [classes.darkTheme]: !!darkTheme,
      })}
      style={customStyles}
    />
  );
};

DividerElement.defaultProps = {
  hidden: false,
  noMargin: false,
  margin: false,
};

export default withStyles(styles)(DividerElement);
