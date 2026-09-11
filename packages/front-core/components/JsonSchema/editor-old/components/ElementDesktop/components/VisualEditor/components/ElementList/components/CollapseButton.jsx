import React from 'react';
import classNames from 'classnames';
import { Toolbar, Button } from '@mui/material';
import { makeStyles } from '@mui/styles';
import ChevronIcon from 'assets/icons/arrow_forward_ios.svg';

const withStyles = makeStyles({
  root: {
    color: 'inherit',
    justifyContent: 'flex-start',
    textTransform: 'inherit',
    fontWeight: 500,
    fontSize: 14,
    lineHeight: '20px',
    padding: 12,
  },
  label: {
    justifyContent: 'flex-start',
  },
  closed: {
    transform: 'rotate(180deg)',
  },
  icon: {
    marginRight: 12,
    marginLeft: 12,
    position: 'relative',
  },
  border: {
    position: 'relative',
    '&::after': {
      content: ' ',
      position: 'absolute',
      top: 0,
      left: 0,
      display: 'block',
      width: 1,
      height: '100%',
      background: '#4E4E4E',
    },
  },
});

const CollapseButton = ({ open, onClick, title }) => {
  const classes = withStyles();

  return (
    <Toolbar disableGutters={true}>
      <Button fullWidth={true} classes={classes} onClick={onClick}>
        <div className={classes.border}>
          <img
            src={ChevronIcon}
            alt="chevron icon"
            className={classNames({
              [classes.icon]: true,
              [classes.closed]: !open,
            })}
          />
        </div>
        {open ? title : null}
      </Button>
    </Toolbar>
  );
};

export default CollapseButton;
