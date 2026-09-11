import React, { ComponentType, ReactNode } from 'react';
import { Typography } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

const styles = (theme: Theme) => ({
  wrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    alignSelf: 'center',
    [theme.breakpoints.down('lg')]: {
      marginTop: 50,
      paddingLeft: 0
    }
  },
  title: {
    marginTop: 15,
    marginBottom: 16,
    maxWidth: 600,
    textAlign: 'center' as const,
    fontSize: 22,
    lineHeight: '28px',
    fontWeight: 400
  },
  subtitle: {
    marginBottom: 50,
    maxWidth: 600,
    textAlign: 'center' as const
  }
});

interface EmptyPageProps extends WithStyles<typeof styles> {
  title?: string;
  description?: string;
  children?: ReactNode;
  Icon?: ComponentType;
}

const EmptyPage = ({ title = '', description = '', classes, Icon, children = <div /> }: EmptyPageProps) => (
  <div className={classes.wrap}>
    {Icon ? <Icon /> : null}
    <Typography className={classes.title} variant="h1">
      {title}
    </Typography>
    <Typography className={classes.subtitle} variant="body1">
      {description}
    </Typography>
    {children}
  </div>
);

export default withStyles(styles)(EmptyPage);
