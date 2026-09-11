import type { CSSProperties, ReactNode } from 'react';
import { Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import withStyles, { type WithStyles } from '@mui/styles/withStyles';

const styles = (theme: Theme) => ({
  title: {
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
    },
  },
});

interface FieldValueProps extends WithStyles<typeof styles> {
  children?: ReactNode;
  style?: CSSProperties;
}

const FieldValue = ({ children = null, classes, style = {} }: FieldValueProps) => (
  <Typography
    className={classes.title}
    style={{ marginBottom: 13, ...style }}
    variant="body2"
  >
    {children}
  </Typography>
);

export default withStyles(styles)(FieldValue);
