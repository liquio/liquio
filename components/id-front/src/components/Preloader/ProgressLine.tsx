import React from 'react';
import type { CSSProperties } from 'react';
import { LinearProgress } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { WithStyles } from '@mui/styles/withStyles';

const styles = {
  root: {
    height: 2,
    zIndex: 1300,
    marginBottom: -2,
  },
  progress: {
    height: 2,
  },
};

interface ProgressLineProps extends WithStyles<typeof styles> {
  loading?: boolean;
  // `null` was the old default; React treats a null and an undefined `style` the same way (no attribute).
  style?: CSSProperties | null;
  ariaLabel?: string;
}

const ProgressLine = ({ classes, loading = false, style, ariaLabel }: ProgressLineProps) => (
  <div className={classes.root} style={style ?? undefined}>
    {loading ? <LinearProgress aria-label={ariaLabel} className={classes.progress} /> : null}
  </div>
);

export default withStyles(styles)(ProgressLine);
