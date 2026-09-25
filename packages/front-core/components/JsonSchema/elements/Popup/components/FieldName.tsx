import type { CSSProperties, ReactNode } from 'react';
import { Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import withStyles, { type WithStyles } from '@mui/styles/withStyles';

const styles = (theme: Theme) => ({
  title: {
    [theme.breakpoints.down('md')]: {
      fontSize: 10,
    },
  },
});

interface FieldNameProps extends WithStyles<typeof styles> {
  children?: ReactNode;
  style?: CSSProperties;
}

const FieldName = ({ children = null, classes, style = {} }: FieldNameProps) => (
  <Typography
    className={classes.title}
    color="textSecondary"
    style={{ letterSpacing: '-0.02em', ...style }}
    variant="caption"
  >
    {children}
  </Typography>
);

export default withStyles(styles)(FieldName);
