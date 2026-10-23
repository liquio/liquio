import React from 'react';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import { Theme } from '@mui/material/styles';

const styles = (theme: Theme) => ({
  mainContent: {
    padding: '0 20px',
    boxSizing: 'content-box' as const,
    [theme.breakpoints.up('sm')]: {
      padding: '0 40px',
      paddingBottom: 100,
    },
  },
  smallPadding: {
    padding: '0 16px 16px',
  },
});

interface ContentProps {
  children: React.ReactNode;
  className?: string;
  classes: Record<string, string>;
  small?: boolean;
  maxWidth?: number | string;
  paddingBottom?: number | string;
}

const Content = ({
  children,
  className = '',
  classes,
  small = false,
  maxWidth = '100%',
  paddingBottom,
}: ContentProps) => (
  <main
    style={{ maxWidth, paddingBottom }}
    className={classNames(className, {
      [classes.mainContent]: true,
      [classes.smallPadding]: small,
    })}
  >
    {children}
  </main>
);

export default withStyles(styles)(Content as never) as unknown as React.ComponentType<Record<string, unknown>>;
