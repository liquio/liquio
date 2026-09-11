import React from 'react';
import classNames from 'classnames';
import { Tooltip, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import DeleteImage from '@mui/icons-material/Delete';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

const styles = (theme) => ({
  positioning: {
    position: 'absolute',
    right: -50,
    [theme.breakpoints.down('md')]: {
      position: 'static',
    },
  },
  positioningButton: {
    position: 'relative',
    top: -5,
    [theme.breakpoints.down('md')]: {
      position: 'static',
    },
  },
  fullWidth: {
    position: 'absolute',
    right: -35,
  },
  darkThemeHover: {
    '& svg': {
      fill: 'rgba(255, 255, 255, 0.7)',
    },
    '&:hover': {
      backgroundColor: 'rgb(46 46 46)',
    },
  },
});

const DeleteButton = ({
  classes,
  t,
  deleteItem,
  readOnly,
  absolute,
  fullWidth,
  darkTheme,
}) => (
  <div
    className={classNames({
      [classes.positioning]: absolute,
      [classes.fullWidth]: fullWidth,
    })}
  >
    <Tooltip title={t('DeleteItem')}>
      <IconButton
        onClick={deleteItem}
        disabled={readOnly}
        className={classNames({
          [classes.positioningButton]: absolute,
          [classes.darkThemeHover]: darkTheme,
        })}
        aria-label={t('DeleteItem')}
      >
        {darkTheme ? <DeleteOutlineOutlinedIcon /> : <DeleteImage />}
      </IconButton>
    </Tooltip>
  </div>
);

const styled = withStyles(styles)(DeleteButton);
export default styled;
