import React from 'react';
import classNames from 'classnames';
import { LinearProgress } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = {
  root: {
    height: 2,
    zIndex: 1300,
    marginBottom: -2,
    width: '100%',
  },
  progress: {
    height: 2,
  },
};

interface ProgressLineProps {
  classes: Record<string, string>;
  loading?: boolean;
  style?: React.CSSProperties | null;
  classCustom?: string;
}

const ProgressLine = ({ classes, loading = false, style = null, classCustom = '' }: ProgressLineProps) => (
  <div className={classNames(classes.root, classCustom)} style={style || undefined}>
    {loading ? (
      <LinearProgress
        className={classes.progress}
        {...({ 'aria-label': loading } as unknown as Record<string, unknown>)}
      />
    ) : null}
  </div>
);

export default withStyles(styles)(ProgressLine as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
