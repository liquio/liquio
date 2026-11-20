import React from 'react';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import RenderOneLine from 'helpers/renderOneLine';

const styles = (theme: Theme) => ({
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

interface FileNameProps {
  classes: Record<string, string>;
  children: React.ReactNode;
  whiteSpace?: boolean;
  cutLine?: boolean;
}

export default withStyles(styles)(
  (({ classes, children, whiteSpace, cutLine }: FileNameProps) => (
    <div
      className={classNames(classes.noBreak, {
        [classes.whiteSpace]: !!whiteSpace
      })}
    >
      {cutLine ? <RenderOneLine {...({ title: children } as unknown as Record<string, unknown>)} /> : children}
    </div>
  )) as never
) as unknown as React.ComponentType<Record<string, unknown>>;
