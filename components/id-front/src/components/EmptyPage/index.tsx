import React from 'react';
import type { ReactNode } from 'react';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { WithStyles } from '@mui/styles/withStyles';

const styles = {
  wrap: {
    width: 700,
    marginTop: 105,
    paddingLeft: 50,
    '@media (max-width: 767px)': {
      width: '100%',
      marginTop: 50,
      paddingLeft: 0,
    },
  },
  title: {
    padding: '0 12px',
    color: '#00224e',
    marginTop: 15,
    marginBottom: 20,
  },
  subtitle: {
    padding: '0 12px',
    color: '#2e2e2e',
    marginBottom: 20,
    textTransform: 'inherit',
    fontSize: 18,
    lineHeight: '24px',
    fontFamily: 'Helvetica',
  },
};

interface EmptyPageProps extends WithStyles<typeof styles> {
  title: string;
  description: string;
  children?: ReactNode;
}

const EmptyPage = ({ title, description, classes, children = <div /> }: EmptyPageProps) => (
  <div className={classes.wrap}>
    <Typography className={classes.title} variant="h4" gutterBottom={true}>
      {title}
    </Typography>
    <Typography className={classes.subtitle} variant="subtitle2" gutterBottom={true}>
      {description}
    </Typography>
    {children}
  </div>
);

export default withStyles(styles)(EmptyPage);
