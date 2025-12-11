import React from 'react';
import { useTranslate } from 'react-translate';
import { Typography } from '@mui/material';

import { makeStyles } from '@mui/styles';

import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';

const withStyles = makeStyles({
  root: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  icon: {
    fontSize: 72,
    color: '#aaa',
  },
  text: {
    marginTop: 12,
  },
});

const EmptyResults = () => {
  const t = useTranslate('WorkflowAdminPage');
  const classes = withStyles();

  return (
    <div className={classes.root}>
      <HourglassEmptyOutlinedIcon className={classes.icon} />
      <Typography className={classes.text}>{t('EmptyResults')}</Typography>
    </div>
  );
};

export default EmptyResults;
