import React from 'react';
import classNames from 'classnames';
import { Tooltip, IconButton } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import DeleteImage from '@mui/icons-material/Delete';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { Theme } from '@mui/material/styles';

const styles = (theme: Theme) => ({
  positioning: {
    position: 'absolute' as const,
    right: -50,
    [theme.breakpoints.down('md')]: {
      position: 'static' as const,
    },
  },
  positioningButton: {
    position: 'relative' as const,
    top: -5,
    [theme.breakpoints.down('md')]: {
      position: 'static' as const,
    },
  },
  fullWidth: {
    position: 'absolute' as const,
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

interface DeleteButtonProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  deleteItem?: () => void;
  readOnly?: boolean;
  absolute?: boolean;
  fullWidth?: boolean;
  darkTheme?: boolean;
}

const DeleteButton = ({
  classes,
  t,
  deleteItem,
  readOnly,
  absolute,
  fullWidth,
  darkTheme,
}: DeleteButtonProps) => (
  <div
    className={classNames({
      [classes.positioning]: !!absolute,
      [classes.fullWidth]: !!fullWidth,
    })}
  >
    <Tooltip title={t('DeleteItem')}>
      <IconButton
        onClick={deleteItem}
        disabled={readOnly}
        className={classNames({
          [classes.positioningButton]: !!absolute,
          [classes.darkThemeHover]: !!darkTheme,
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
