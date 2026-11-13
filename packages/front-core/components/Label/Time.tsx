import React from 'react';
import moment from 'moment';
import { Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

const styles = (theme: Theme) => ({
  text: {
    color: 'inherit',
    minWidth: 140,
    display: 'inline-block',
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
      minWidth: 120,
      lineHeight: '18px',
    },
  },
});

interface TimeProps {
  classes: Record<string, string>;
  format?: string;
  date: string;
}

const Time = ({ classes, format = 'DD.MM.YYYY HH:mm', date }: TimeProps) => {
  if (date) {
    return (
      <Tooltip title={moment(date).fromNow()}>
        <span className={classes.text}>{moment(date).format(format)}</span>
      </Tooltip>
    );
  }

  return null;
};

export default withStyles(styles)(Time as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
